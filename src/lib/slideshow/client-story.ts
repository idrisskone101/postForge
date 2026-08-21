import { createBlankSlideshowProject } from "@/components/slideshow/fixtures";
import { normalizeSlideshowSlides } from "@/components/slideshow/model";
import type {
  SlideshowProject,
  SlideshowSlide,
} from "@/components/slideshow/types";
import { formatGenerationPromptForEditing } from "@/lib/ai/prompt-presentation";
import {
  SlideshowApiError,
  asString,
  isRecord,
  readJsonResponse,
} from "@/lib/slideshow/client-request";
import { slideKindFromUnknown } from "@/lib/slideshow/project";

function readTextItems(content: Record<string, unknown>) {
  const rawItems = Array.isArray(content.textItems) ? content.textItems : [];
  return rawItems.filter(isRecord);
}

export async function requestSlideshowCopyVariation(
  project: SlideshowProject,
  slide: SlideshowSlide,
  apiBaseUrl = "/api/slideshows",
): Promise<Partial<SlideshowSlide>> {
  const response = await fetch(`${apiBaseUrl}/generate-story`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idea: `${slide.prompt}\nCurrent slide: ${slide.headline}`,
      slideCount: 1,
      language: project.language,
      tone: "specific, conversational, concise",
    }),
  });
  const data = await readJsonResponse(response);
  const story = isRecord(data) && isRecord(data.story) ? data.story : {};
  const generatedSlides = Array.isArray(story.slides) ? story.slides : [];
  const generated = generatedSlides.find(isRecord) ?? {};
  const content = isRecord(generated.content) ? generated.content : generated;
  const textItems = readTextItems(content);

  return {
    eyebrow: asString(content.eyebrow, asString(textItems[0]?.text, slide.eyebrow)),
    headline: asString(
      content.headline ?? content.heading,
      asString(textItems[1]?.text, slide.headline),
    ),
    body: asString(content.body, asString(textItems[2]?.text, slide.body)),
    prompt: formatGenerationPromptForEditing(
      asString(generated.imagePrompt, slide.prompt),
    ),
  };
}

export async function requestSlideshowStory(
  input: {
    idea: string;
    slideCount: number;
    language: string;
    includeCta: boolean;
    model?: string;
  },
  apiBaseUrl = "/api/slideshows",
): Promise<SlideshowProject> {
  const response = await fetch(`${apiBaseUrl}/generate-story`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonResponse(response);
  const responseRecord = isRecord(data) ? data : {};
  const story = isRecord(data) && isRecord(data.story) ? data.story : {};
  const generated = Array.isArray(story.slides)
    ? story.slides.filter(isRecord)
    : [];
  if (!generated.length) {
    throw new SlideshowApiError("Story generation returned no slides.", 500);
  }

  const now = new Date().toISOString();
  const localId = `local-${Date.now()}`;
  const base = createBlankSlideshowProject();
  const visualKeys = [
    "coral-glow",
    "blue-studio",
    "lime-paper",
    "violet-dusk",
    "mint-room",
    "paper-stack",
    "sunset-blocks",
    "night-grid",
  ];
  const slides = generated.map((raw, index): SlideshowSlide => {
    const content = isRecord(raw.content) ? raw.content : raw;
    const kind = slideKindFromUnknown(raw.kind ?? raw.role);
    const id = `local-slide-${localId}-${index + 1}`;
    return {
      id,
      clientId: id,
      order: index,
      kind,
      eyebrow: asString(
        content.eyebrow,
        kind === "hook" ? "START HERE" : kind === "cta" ? "NEXT STEP" : `POINT ${index}`,
      ),
      headline: asString(content.headline ?? content.heading, `Slide ${index + 1}`),
      body: asString(content.body),
      prompt: asString(raw.imagePrompt ?? content.imagePrompt),
      visualKey: visualKeys[index % visualKeys.length],
    };
  });
  const includeCta = slides.some((slide) => slide.kind === "cta");

  return {
    ...base,
    id: localId,
    clientId: localId,
    title: asString(story.title, input.idea).slice(0, 160),
    description: input.idea,
    caption: asString(story.caption) || undefined,
    generationProvider:
      responseRecord.provider === "ollama" ? "ollama" : "local-fallback",
    generationModel:
      responseRecord.model && typeof responseRecord.model === "string"
        ? responseRecord.model
        : null,
    generationWarning: asString(responseRecord.warning) || undefined,
    slides: normalizeSlideshowSlides(slides, includeCta),
    includeCta,
    language: input.language,
    templateId: null,
    createdAt: now,
    updatedAt: now,
  };
}
