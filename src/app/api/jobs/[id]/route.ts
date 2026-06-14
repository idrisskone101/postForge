import { NextRequest, NextResponse } from "next/server";
import { getJob, deleteJob } from "@/lib/jobs/queue";
import { ensurePollerRunning } from "@/lib/jobs/poller";
import { ensureCloneWorkerRunning } from "@/lib/ugc/clone-worker";
import { prisma } from "@/lib/db";
import { serializeOutputReviewStatus } from "@/lib/output-review-status";

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
  try {
    const { id } = await params;

    await deleteJob(id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
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
