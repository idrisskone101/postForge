import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { GenerationJob, GeneratedFile } from "@/generated/prisma/client";

async function filterExistingOutputs(
  outputs: GeneratedFile[]
): Promise<GeneratedFile[]> {
  const checks = await Promise.all(
    outputs.map(async (file) => ({
      file,
      exists: file.localPath ? await storage.exists(file.localPath) : false,
    }))
  );

  return checks.filter((entry) => entry.exists).map((entry) => entry.file);
}

export async function createJob(params: {
  type: string;
  model: string;
  prompt: string;
  input: Record<string, unknown>;
  estimatedCost?: number;
  tags?: string[];
}): Promise<GenerationJob> {
  return prisma.generationJob.create({
    data: {
      type: params.type,
      model: params.model,
      prompt: params.prompt,
      input: JSON.parse(JSON.stringify(params.input)),
      estimatedCost: params.estimatedCost,
      status: "queued",
      tags: params.tags ?? [],
    },
  });
}

export async function startJob(jobId: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "processing",
      startedAt: new Date(),
    },
  });
}

export async function completeJob(
  jobId: string,
  output: Record<string, unknown>,
  durationMs: number
): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "completed",
      completedAt: new Date(),
      output: JSON.parse(JSON.stringify(output)),
      durationMs,
    },
  });
}

export async function failJob(jobId: string, error: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "failed",
      error,
      completedAt: new Date(),
    },
  });
}

export async function getJob(
  jobId: string
): Promise<(GenerationJob & { outputs: GeneratedFile[] }) | null> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { outputs: true },
  });

  if (!job) {
    return null;
  }

  return {
    ...job,
    outputs: await filterExistingOutputs(job.outputs),
  };
}

export async function listJobs(
  filters: {
    type?: string;
    status?: string;
    model?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  sort?: "asc" | "desc";
  } = {}
): Promise<{ jobs: (GenerationJob & { outputs: GeneratedFile[] })[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.model) where.model = filters.model;
  if (filters.tag) where.tags = { has: filters.tag };

  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const orderBy = { createdAt: filters.sort ?? ("desc" as const) };

  const [jobs, total] = await Promise.all([
    prisma.generationJob.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy,
      include: { outputs: true },
    }),
    prisma.generationJob.count({ where }),
  ]);

  return {
    jobs: await Promise.all(
      jobs.map(async (job) => ({
        ...job,
        outputs: await filterExistingOutputs(job.outputs),
      }))
    ),
    total,
  };
}

export async function deleteJob(jobId: string): Promise<void> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { outputs: true },
  });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Delete files from storage
  for (const file of job.outputs) {
    if (file.localPath) {
      try {
        await storage.delete(file.localPath);
      } catch (err) {
        console.error(`Failed to delete file ${file.localPath}:`, err);
      }
    }
  }

  // Cascade delete handles GeneratedFile records
  await prisma.generationJob.delete({
    where: { id: jobId },
  });
}

export async function retryJob(jobId: string): Promise<GenerationJob> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (job.status !== "failed") {
    throw new Error(`Can only retry failed jobs. Current status: ${job.status}`);
  }

  const input = job.input as Record<string, unknown>;

  return createJob({
    type: job.type,
    model: job.model,
    prompt: job.prompt,
    input,
    estimatedCost: job.estimatedCost ?? undefined,
    tags: job.tags,
  });
}

export async function addGeneratedFile(params: {
  jobId: string;
  type: string;
  originalUrl: string;
  localPath: string;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSec?: number;
  fileSizeBytes?: number;
}): Promise<GeneratedFile> {
  return prisma.generatedFile.create({
    data: {
      jobId: params.jobId,
      type: params.type,
      originalUrl: params.originalUrl,
      localPath: params.localPath,
      filename: params.filename,
      mimeType: params.mimeType,
      width: params.width,
      height: params.height,
      durationSec: params.durationSec,
      fileSizeBytes: params.fileSizeBytes,
    },
  });
}

export async function getPendingFalJobs(
  options: { tag?: string; limit?: number } = {}
): Promise<GenerationJob[]> {
  return prisma.generationJob.findMany({
    where: {
      status: "processing",
      falRequestId: { not: null },
      ...(options.tag ? { tags: { has: options.tag } } : {}),
      NOT: {
        tags: { has: "ugc-clone" },
      },
    },
    orderBy: [{ lastPolledAt: "asc" }, { createdAt: "asc" }],
    ...(options.limit ? { take: options.limit } : {}),
  });
}
