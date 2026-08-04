import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs/queue";
import { ensurePollerRunning } from "@/lib/jobs/poller";
import { ensureCloneWorkerRunning } from "@/lib/ugc/clone-worker";
import { prisma } from "@/lib/db";
import { serializeOutputReviewStatus } from "@/lib/output-review-status";
import { storage } from "@/lib/storage";
import {
  assertAssetsAreNotPublicationLeased,
  UnresolvedPublicationConflictError,
  withLockedAutomationRecords,
} from "@/lib/publication-lifecycle";
import {
  isSameOriginMutation,
  rejectCrossOriginMutation,
} from "@/lib/integrations/routes";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getJob(id);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // If job is still processing, ensure the poller is running
    // (handles server restarts that kill the in-memory poller)
    if (job.status === "processing" && job.falRequestId) {
      ensurePollerRunning();
    }
    if (
      job.type === "video" &&
      job.tags.includes("ugc-clone") &&
      (job.status === "queued" || job.status === "processing")
    ) {
      ensureCloneWorkerRunning();
    }

    const outputs = job.outputs.map((file: { id: string; type: string; filename: string; mimeType: string; width: number | null; height: number | null; durationSec: number | null; fileSizeBytes: number | null; reviewStatus: string | null; createdAt: Date }) => ({
      id: file.id,
      url: `/api/files/${file.id}`,
      type: file.type,
      filename: file.filename,
      mimeType: file.mimeType,
      width: file.width,
      height: file.height,
      durationSec: file.durationSec,
      fileSizeBytes: file.fileSizeBytes,
      reviewStatus: serializeOutputReviewStatus(file.reviewStatus),
      createdAt: file.createdAt.toISOString(),
    }));

    const input = asRecord(job.input);
    const requestedTikTokSourceId = asString(input?.tiktokSourceId);
    const sourceVideoPath = asString(input?.tiktokVideoPath);

    const tikTokSource = requestedTikTokSourceId
      ? await prisma.tikTokSource.findUnique({
          where: { id: requestedTikTokSourceId },
          select: { id: true, label: true, originalUrl: true },
        })
      : null;

    const resolvedTikTokSource =
      tikTokSource ??
      (sourceVideoPath
        ? await prisma.tikTokSource.findFirst({
            where: { localPath: sourceVideoPath },
            select: { id: true, label: true, originalUrl: true },
          })
        : null);

    const slideshowResult = job.tags.includes("slideshow")
      ? await prisma.slideshowSlide.findFirst({
          where: { generationJobId: job.id },
          select: {
            id: true,
            projectId: true,
            imageUrl: true,
            generatedFileId: true,
            project: { select: { revision: true } },
          },
        })
      : null;

    return NextResponse.json({
      id: job.id,
      type: job.type,
      model: job.model,
      status: job.status,
      prompt: job.prompt,
      input: job.input,
      output: job.output,
      estimatedCost: job.estimatedCost,
      actualCost: job.actualCost,
      durationMs: job.durationMs,
      error: job.error,
      tags: job.tags,
      outputs,
      slideshow: slideshowResult
        ? {
            projectId: slideshowResult.projectId,
            slideId: slideshowResult.id,
            projectRevision: slideshowResult.project.revision,
            imageUrl: slideshowResult.imageUrl,
            generatedFileId: slideshowResult.generatedFileId,
          }
        : null,
      tikTokSource: resolvedTikTokSource,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();
  try {
    const { id } = await params;

    const job = await getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.status !== "completed" && job.status !== "failed") {
      return NextResponse.json(
        {
          error:
            "Active generations cannot be deleted because the provider job is still running.",
        },
        { status: 409 }
      );
    }

    const localPaths = await withLockedAutomationRecords(async (records, transaction) => {
      const storedJob = await transaction.generationJob.findUnique({
        where: { id },
        select: { outputs: { select: { id: true, localPath: true } } },
      });
      if (!storedJob) throw new Error(`Job not found: ${id}`);
      assertAssetsAreNotPublicationLeased(
        records,
        storedJob.outputs.map((output) => output.id)
      );
      await transaction.generationJob.delete({ where: { id } });
      return {
        result: storedJob.outputs
          .map((output) => output.localPath)
          .filter(Boolean),
      };
    });
    await Promise.all(
      localPaths.map(async (localPath) => {
        try {
          await storage.delete(localPath);
        } catch (error) {
          console.error(`Failed to delete file ${localPath}:`, error);
        }
      })
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof UnresolvedPublicationConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }
    console.error("Failed to delete job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
