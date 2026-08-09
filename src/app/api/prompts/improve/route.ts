import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/ai/models";
import { improveGenerationPrompt } from "@/lib/ai/improve-prompt";
import {
  isSameOriginMutation,
  rejectCrossOriginMutation,
} from "@/lib/integrations/routes";

const VALID_ASPECT_RATIOS = new Set(["9:16", "4:5", "1:1", "4:3", "3:2", "16:9"]);

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  const modelId = typeof input.model === "string" ? input.model.trim() : "";
  const aspectRatio =
    typeof input.aspectRatio === "string" ? input.aspectRatio.trim() : "";

  if (!prompt) {
    return NextResponse.json(
      { error: "Write a rough prompt before improving it." },
      { status: 400 }
    );
  }
  if (prompt.length > 1_500) {
    return NextResponse.json(
      { error: "The prompt must be 1,500 characters or fewer." },
      { status: 400 }
    );
  }

  const model = getModel(modelId);
  if (!model) {
    return NextResponse.json(
      { error: "Choose a generation model before improving the prompt." },
      { status: 400 }
    );
  }
  if (!VALID_ASPECT_RATIOS.has(aspectRatio)) {
    return NextResponse.json(
      { error: "Choose a supported aspect ratio before improving the prompt." },
      { status: 400 }
    );
  }

  const duration =
    typeof input.duration === "number" && Number.isFinite(input.duration)
      ? Math.round(input.duration)
      : undefined;
  if (
    model.type === "video" &&
    (duration === undefined ||
      duration < (model.limits.minDuration ?? 1) ||
      duration > (model.limits.maxDuration ?? 60))
  ) {
    return NextResponse.json(
      { error: "Choose a supported video duration before improving the prompt." },
      { status: 400 }
    );
  }

  try {
    const result = await improveGenerationPrompt({
      prompt,
      outputType: model.type,
      modelId: model.id,
      modelName: model.name,
      aspectRatio,
      duration: model.type === "video" ? duration : undefined,
      enableAudio:
        input.enableAudio === true && model.capabilities.nativeAudio === true,
      hasCharacterReference: input.hasCharacterReference === true,
      hasVisualReference: input.hasVisualReference === true,
      isVideoEdit: model.capabilities.subjectSwap === true,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Prompt improvement failed. Your original prompt is unchanged.";
    const status = /Connect Gemini/i.test(message)
      ? 503
      : /rough prompt|1,500/i.test(message)
        ? 400
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
