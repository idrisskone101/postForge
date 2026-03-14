import { NextRequest, NextResponse } from "next/server";
import { getJob, deleteJob } from "@/lib/jobs/queue";
import { ensurePollerRunning } from "@/lib/jobs/poller";

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

    const outputs = job.outputs.map((file: { id: string; type: string; filename: string; mimeType: string; width: number | null; height: number | null; durationSec: number | null; fileSizeBytes: number | null; createdAt: Date }) => ({
      id: file.id,
      url: `/api/files/${file.id}`,
      type: file.type,
      filename: file.filename,
      mimeType: file.mimeType,
      width: file.width,
      height: file.height,
      durationSec: file.durationSec,
      fileSizeBytes: file.fileSizeBytes,
      createdAt: file.createdAt.toISOString(),
    }));

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
