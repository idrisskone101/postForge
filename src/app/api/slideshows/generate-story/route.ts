import { NextRequest, NextResponse } from "next/server";
import { generateSlideshowStory } from "@/lib/ai/slideshow-story";
import { resolveStoryModelOllamaId } from "@/lib/ai/story-models";
import { badRequest } from "@/lib/slideshow/errors";
import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  optionalInteger,
  optionalString,
  requireRecord,
  requiredString,
} from "@/lib/slideshow/validation";

export async function POST(request: NextRequest) {
  try {
    const body = requireRecord(await readJsonRequest(request));
    const includeCta = body.includeCta;
    if (includeCta !== undefined && typeof includeCta !== "boolean") {
      badRequest("includeCta must be a boolean");
    }
    const result = await generateSlideshowStory(
      {
        idea: requiredString(body, "idea", { max: 2_000 }),
        slideCount: optionalInteger(body, "slideCount", { min: 1, max: 20 }),
        language: optionalString(body, "language", { max: 80 }),
        tone: optionalString(body, "tone", { max: 160 }),
        audience: optionalString(body, "audience", { max: 300 }),
        includeCta: includeCta as boolean | undefined,
      },
      resolveStoryModelOllamaId(optionalString(body, "model", { max: 80 })),
    );
    const slides = result.slides.map((slide, position) => ({
      position,
      kind: slide.role === "body" ? "content" : slide.role,
      role: slide.role,
      imagePrompt: slide.imagePrompt,
      content: {
        eyebrow: slide.role === "hook" ? "START HERE" : "",
        headline: slide.heading,
        body: slide.body,
        textItems: [
          { id: `generated-${position}-headline`, role: "headline", text: slide.heading },
          { id: `generated-${position}-body`, role: "body", text: slide.body },
        ],
      },
    }));
    return NextResponse.json({
      source: result.provider,
      provider: result.provider,
      model: result.model,
      warning: result.warning,
      story: {
        title: result.title,
        caption: result.caption,
        slides,
      },
    });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to generate slideshow story");
  }
}
