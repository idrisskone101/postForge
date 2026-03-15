import { NextRequest, NextResponse } from "next/server";
import { getJob, retryJob } from "@/lib/jobs/queue";
import { generateImage } from "@/lib/ai/generate-image";
import { generateVideo } from "@/lib/ai/generate-video";
import type { ImageGenerationRequest, VideoGenerationRequest } from "@/lib/ai/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const originalJob = await getJob(id);

    if (!originalJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    if (originalJob.status !== "failed") {
      return NextResponse.json(
        { error: `Can only retry failed jobs. Current status: ${originalJob.status}` },
        { status: 400 }
      );
    }

    // Create a new job from the original
    const newJob = await retryJob(id);

    // Re-submit the generation based on original type
    const input = originalJob.input as Record<string, unknown>;

    try {
      if (originalJob.type === "image") {
        const imageRequest: ImageGenerationRequest = {
          prompt: originalJob.prompt,
          model: originalJob.model,
          aspectRatio: input.aspectRatio as string | undefined,
          numImages: input.numImages as number | undefined,
          negativePrompt: input.negativePrompt as string | undefined,
          imageUrls: (input.referenceImageUrls ?? input.imageUrls) as string[] | undefined,
          enableWebSearch: input.enableWebSearch as boolean | undefined,
        };
        await generateImage(imageRequest);
      } else if (originalJob.type === "video") {
        const videoRequest: VideoGenerationRequest = {
          prompt: originalJob.prompt,
          model: originalJob.model,
          duration: input.duration as number | undefined,
          aspectRatio: input.aspectRatio as string | undefined,
          inputImageUrl: input.inputImageUrl as string | undefined,
          enableAudio: input.enableAudio as boolean | undefined,
        };
        await generateVideo(videoRequest);
      }
    } catch (genError) {
      console.error("Failed to resubmit generation on retry:", genError);
      // The new job was created but generation submission failed.
      // The job will remain in "queued" state for manual retry.
    }

    return NextResponse.json(
      {
        id: newJob.id,
        originalJobId: id,
        status: newJob.status,
        type: newJob.type,
        model: newJob.model,
        estimatedCost: newJob.estimatedCost,
        createdAt: newJob.createdAt.toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Failed to retry job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry job" },
      { status: 500 }
    );
  }
}
