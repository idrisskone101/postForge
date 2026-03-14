import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs/queue";

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

    if (job.type !== "video") {
      return NextResponse.json(
        { error: "Job is not a video generation job" },
        { status: 404 }
      );
    }

    const firstOutput = job.outputs[0];
    const video = firstOutput
      ? {
          id: firstOutput.id,
          url: `/api/files/${firstOutput.id}`,
          width: firstOutput.width,
          height: firstOutput.height,
          durationSec: firstOutput.durationSec,
          mimeType: firstOutput.mimeType,
          hasAudio: firstOutput.mimeType?.includes("video") ?? false,
        }
      : null;

    return NextResponse.json({
      id: job.id,
      type: job.type,
      model: job.model,
      status: job.status,
      prompt: job.prompt,
      input: job.input,
      estimatedCost: job.estimatedCost,
      actualCost: job.actualCost,
      durationMs: job.durationMs,
      error: job.error,
      video,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch video job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}
