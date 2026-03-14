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

    if (job.type !== "image") {
      return NextResponse.json(
        { error: "Job is not an image generation job" },
        { status: 404 }
      );
    }

    const images = job.outputs.map((file: { id: string; width: number | null; height: number | null; mimeType: string }) => ({
      id: file.id,
      url: `/api/files/${file.id}`,
      width: file.width,
      height: file.height,
      mimeType: file.mimeType,
    }));

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
      images,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Failed to fetch image job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}
