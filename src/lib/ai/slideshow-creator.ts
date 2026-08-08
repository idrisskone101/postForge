import { randomUUID } from "crypto";

import { submitToQueue } from "./fal-client";
import { ensurePollerRunning } from "@/lib/jobs/poller";
import {
  calculateEstimatedCost,
  getModel,
  mapAspectRatioToFalFormat,
} from "./models";
import { getProviderCredential } from "@/lib/providers/credentials";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type {
  SlideshowAestheticTemplate,
  SlideshowCreatorScene,
  SlideshowCreatorSlideInput,
  SlideshowCreatorVisualsResult,
} from "./slideshow-creator-types";

/**
 * Slideshow Creator: GPT Image 2 visual generation driven by a structured
 * aesthetic JSON template.
 *
 * The template is the *stable* contract for a deck (core vibe, palette,
 * lighting, composition, camera feel, storytelling). Per slide we only vary
 * the mutable scene (location, activity, environment example) so every image
 * stays on-brand while remaining distinct.
 *
 * The same template can be:
 *   1. pasted directly by the operator (a `SlideshowAestheticTemplate`), or
 *   2. derived from reference images (Collections assets / uploads) by a
 *      vision model, then used as the structure for fresh generations.
 */

/* ------------------------------------------------------------------ */
/* Input type (extends the shared client-safe types)                   */
/* ------------------------------------------------------------------ */

export interface SlideshowCreatorVisualsInput {
  projectId: string;
  template: SlideshowAestheticTemplate;
  slides: SlideshowCreatorSlideInput[];
  aspectRatio?: "9:16" | "4:5" | "1:1" | "16:9";
  model?: string;
}

/* ------------------------------------------------------------------ */
/* Template validation                                                 */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
    ? (value as string[])
    : undefined;
}

function stringOr(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Parse and normalize an operator-supplied aesthetic JSON template. Unknown
 * keys are tolerated (preserved by the caller when persisting); the fields the
 * prompt builder relies on are validated here.
 */
export function parseSlideshowAestheticTemplate(
  value: unknown
): SlideshowAestheticTemplate {
  if (!isRecord(value)) {
    throw new Error("The visual template must be a JSON object.");
  }
  const aesthetic = value.aesthetic;
  if (!isRecord(aesthetic)) {
    throw new Error("The visual template is missing its 'aesthetic' section.");
  }
  const coreVibe = stringOr(aesthetic.core_vibe);
  if (!coreVibe) {
    throw new Error(
      "The visual template needs 'aesthetic.core_vibe' to anchor the deck."
    );
  }
  const visualStyle = isRecord(value.visual_style) ? value.visual_style : {};
  if (!stringOr(visualStyle.genre)) {
    throw new Error(
      "The visual template needs 'visual_style.genre' (e.g. editorial lifestyle photography)."
    );
  }

  const mood = stringList(aesthetic.mood)?.slice(0, 20) ?? [];

  return {
    aesthetic: {
      core_vibe: coreVibe,
      mood,
      energy: stringOr(aesthetic.energy),
    },
    visual_style: {
      genre: stringOr(visualStyle.genre)!,
      realism: stringOr(visualStyle.realism) ?? "natural photographic realism",
      finish: stringOr(visualStyle.finish),
      inspiration: stringOr(visualStyle.inspiration),
      avoid: stringList(visualStyle.avoid)?.slice(0, 20),
    },
    lighting: isRecord(value.lighting)
      ? {
          style: stringOr(value.lighting.style),
          exposure: stringOr(value.lighting.exposure),
          contrast: stringOr(value.lighting.contrast),
          highlights: stringOr(value.lighting.highlights),
          atmosphere: stringOr(value.lighting.atmosphere),
        }
      : undefined,
    color: isRecord(value.color)
      ? {
          palette: stringOr(value.color.palette),
          dominant_tones: stringList(value.color.dominant_tones)?.slice(0, 12),
          saturation: stringOr(value.color.saturation),
          temperature: stringOr(value.color.temperature),
          black_and_white: stringOr(value.color.black_and_white),
        }
      : undefined,
    composition: isRecord(value.composition)
      ? {
          style: stringOr(value.composition.style),
          framing: stringOr(value.composition.framing),
          posing: stringOr(value.composition.posing),
          negative_space: stringOr(value.composition.negative_space),
          perspective: stringOr(value.composition.perspective),
          imperfection: stringOr(value.composition.imperfection),
        }
      : undefined,
    subject_direction: isRecord(value.subject_direction)
      ? {
          presence: stringOr(value.subject_direction.presence),
          expression: stringOr(value.subject_direction.expression),
          body_language: stringOr(value.subject_direction.body_language),
          wardrobe: stringOr(value.subject_direction.wardrobe),
          branding: stringOr(value.subject_direction.branding),
        }
      : undefined,
    environment: isRecord(value.environment)
      ? {
          feel: stringOr(value.environment.feel),
          examples: stringList(value.environment.examples)?.slice(0, 12),
          rule: stringOr(value.environment.rule),
        }
      : undefined,
    camera_feel: isRecord(value.camera_feel)
      ? {
          look: stringOr(value.camera_feel.look),
          depth_of_field: stringOr(value.camera_feel.depth_of_field),
          texture: stringOr(value.camera_feel.texture),
          sharpness: stringOr(value.camera_feel.sharpness),
          motion: stringOr(value.camera_feel.motion),
          dynamic_range: stringOr(value.camera_feel.dynamic_range),
        }
      : undefined,
    storytelling: isRecord(value.storytelling)
      ? {
          concept: stringOr(value.storytelling.concept),
          tone: stringOr(value.storytelling.tone),
          luxury: stringOr(value.storytelling.luxury),
        }
      : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Per-slide prompt builder (JSON prompting for GPT Image 2)           */
/* ------------------------------------------------------------------ */

function asList(items: string[] | undefined, label: string) {
  if (!items?.length) return "";
  return `${label}: ${items.join("; ")}`;
}

/**
 * Build a JSON-structured prompt for GPT Image 2 for a single slide.
 *
 * The aesthetic blocks (vibe, palette, lighting, composition, camera feel,
 * storytelling) are emitted verbatim from the template so the deck stays
 * cohesive. Only the per-slide scene (location + activity + subject) and the
 * slide's overlaid text vary. The text is used as *context* for what the scene
 * should depict, while an explicit guardrail keeps the model from baking
 * legible text into the pixels (the copy is overlaid in the renderer).
 */
export function buildSlideshowCreatorPrompt(
  template: SlideshowAestheticTemplate,
  slide: SlideshowCreatorSlideInput,
  aspectRatio: "9:16" | "4:5" | "1:1" | "16:9" = "9:16"
): string {
  const scene = slide.scene ?? {};
  const subject = scene.subject?.trim() ?? "the subject";

  const blocks: string[] = [
    `CORE VIBE: ${template.aesthetic.core_vibe}`,
    ...(template.aesthetic.mood?.length
      ? [asList(template.aesthetic.mood, "MOOD")]
      : []),
    ...(template.aesthetic.energy
      ? [`ENERGY: ${template.aesthetic.energy}`]
      : []),
    `GENRE: ${template.visual_style.genre}`,
    `REALISM: ${template.visual_style.realism}`,
    ...(template.visual_style.finish
      ? [`FINISH: ${template.visual_style.finish}`]
      : []),
    ...(template.visual_style.inspiration
      ? [`INSPIRATION: ${template.visual_style.inspiration}`]
      : []),
  ];

  if (template.lighting) {
    const parts = [
      template.lighting.style,
      template.lighting.exposure,
      template.lighting.contrast,
      template.lighting.highlights,
      template.lighting.atmosphere,
    ].filter(Boolean);
    if (parts.length) blocks.push(`LIGHTING: ${parts.join("; ")}`);
  }
  if (template.color) {
    const parts = [
      template.color.palette,
      ...(template.color.dominant_tones ?? []),
      template.color.saturation,
      template.color.temperature,
      template.color.black_and_white,
    ].filter(Boolean);
    if (parts.length) blocks.push(`COLOR: ${parts.join("; ")}`);
  }
  if (template.composition) {
    const parts = [
      template.composition.style,
      template.composition.framing,
      template.composition.posing,
      template.composition.negative_space,
      template.composition.perspective,
      template.composition.imperfection,
    ].filter(Boolean);
    if (parts.length) blocks.push(`COMPOSITION: ${parts.join("; ")}`);
  }
  if (template.subject_direction) {
    const parts = [
      template.subject_direction.presence,
      template.subject_direction.expression,
      template.subject_direction.body_language,
      template.subject_direction.wardrobe,
      template.subject_direction.branding,
    ].filter(Boolean);
    if (parts.length) blocks.push(`SUBJECT DIRECTION: ${parts.join("; ")}`);
  }
  if (template.environment) {
    const parts = [
      template.environment.feel,
      ...(template.environment.examples ?? []),
      template.environment.rule,
    ].filter(Boolean);
    if (parts.length) blocks.push(`ENVIRONMENT: ${parts.join("; ")}`);
  }
  if (template.camera_feel) {
    const parts = [
      template.camera_feel.look,
      template.camera_feel.depth_of_field,
      template.camera_feel.texture,
      template.camera_feel.sharpness,
      template.camera_feel.motion,
      template.camera_feel.dynamic_range,
    ].filter(Boolean);
    if (parts.length) blocks.push(`CAMERA FEEL: ${parts.join("; ")}`);
  }
  if (template.storytelling) {
    const parts = [
      template.storytelling.concept,
      template.storytelling.tone,
      template.storytelling.luxury,
    ].filter(Boolean);
    if (parts.length) blocks.push(`STORYTELLING: ${parts.join("; ")}`);
  }

  // Mutable scene: this is the variation knob.
  if (scene.location?.trim()) {
    blocks.push(`LOCATION: ${scene.location.trim()}`);
  }
  if (scene.activity?.trim()) {
    blocks.push(`ACTIVITY: ${scene.activity.trim()}`);
  }

  const textContext = slide.text.trim().slice(0, 240);
  blocks.push(
    `SCENE: Show ${subject}${
      scene.location?.trim() ? ` in ${scene.location.trim()}` : ""
    }${
      scene.activity?.trim() ? `, ${scene.activity.trim()}` : ""
    } in a single candid, believable moment.`
  );

  const prompt: Record<string, unknown> = {
    aspect_ratio: aspectRatio,
    intent: "Slideshow slide background image",
    on_slide_text: textContext,
    image_requirements: {
      realistic: true,
      matches_overlaid_copy: true,
      no_baked_in_text: true,
      no_captions_logos_borders_watermarks: true,
      keep_subject_in_center_safe_area: true,
      negative_space_for_copy: true,
    },
    aesthetic: blocks,
  };

  return JSON.stringify(prompt, null, 2);
}

/* ------------------------------------------------------------------ */
/* GPT Image 2 generation + project persistence                       */
/* ------------------------------------------------------------------ */

const CREATOR_ASPECT_RATIOS = new Set(["9:16", "4:5", "1:1", "16:9"]);

function sanitizeAspectRatio(value: unknown): "9:16" | "4:5" | "1:1" | "16:9" {
  return CREATOR_ASPECT_RATIOS.has(String(value))
    ? (String(value) as "9:16" | "4:5" | "1:1" | "16:9")
    : "9:16";
}

function sceneFrom(body: Record<string, unknown>): SlideshowCreatorScene {
  const raw = body.scene;
  if (!isRecord(raw)) return {};
  return {
    location: stringOr(raw.location),
    activity: stringOr(raw.activity),
    subject: stringOr(raw.subject),
  };
}

function slideInputFrom(value: unknown): SlideshowCreatorSlideInput {
  if (!isRecord(value)) {
    throw new Error("Each slideshow slide needs an id and text.");
  }
  const slideId = stringOr(value.slideId ?? value.id);
  const text = stringOr(value.text ?? value.headline ?? value.body);
  if (!slideId) throw new Error("A slideshow slide is missing its id.");
  if (!text) throw new Error("A slideshow slide is missing its on-slide text.");
  return { slideId, text, scene: sceneFrom(value) };
}

/**
 * Generate GPT Image 2 visuals for every slide in one project, reserve a job
 * per slide, and attach each job to its slide. Returns the queued jobs.
 *
 * The aesthetic template is frozen; per-slide scenes drive variation. This is
 * intentionally a separate, explicit mutation from editing copy — generating
 * visuals is always the operator's explicit action.
 */
export async function generateSlideshowCreatorVisuals(
  input: SlideshowCreatorVisualsInput
): Promise<SlideshowCreatorVisualsResult> {
  const modelId = input.model?.trim() || "gpt-image-2";
  const model = getModel(modelId);
  if (!model || model.type !== "image") {
    throw new Error(`Unknown slideshow image model: ${modelId}`);
  }
  const aspectRatio = sanitizeAspectRatio(input.aspectRatio);
  const template = parseSlideshowAestheticTemplate(input.template);
  const slides = (input.slides ?? []).map(slideInputFrom);
  if (!slides.length) {
    throw new Error("At least one slide is required to generate visuals.");
  }
  if (slides.length > slideshowCreatorLimits.maxSlides) {
    throw new Error(
      `A slideshow can generate visuals for at most ${slideshowCreatorLimits.maxSlides} slides (got ${slides.length}).`
    );
  }

  const project = await prisma.slideshowProject.findUnique({
    where: { id: input.projectId },
    select: { id: true, revision: true },
  });
  if (!project) throw new Error("Slideshow project was not found.");
  const expectedRevision = project.revision;

  const costPerImage = calculateEstimatedCost(modelId, { numImages: 1 });
  const estimatedCost = costPerImage * slides.length;

  const jobs: Array<{ slideId: string; jobId: string; estimatedCost: number }> =
    [];
  const createdJobs: Array<{
    jobId: string;
    projectRevision: number;
    slideId: string;
  }> = [];

  for (const slide of slides) {
    const prompt = buildSlideshowCreatorPrompt(template, slide, aspectRatio);
    // Each per-slide transaction bumps the project revision by 1, so the
    // concurrency guard must expect the revision at this slide's position in
    // the batch (base + already-queued count), not the stale base captured
    // once. Otherwise every deck with 2+ slides would fail on slide 2.
    const queued = await queueCreatorSlideImage({
      projectId: input.projectId,
      slideId: slide.slideId,
      prompt,
      aspectRatio,
      modelId,
      expectedRevision: expectedRevision + createdJobs.length,
    });
    createdJobs.push(queued);
    jobs.push({
      slideId: slide.slideId,
      jobId: queued.jobId,
      estimatedCost: costPerImage,
    });
  }

  const finalRevision = createdJobs[createdJobs.length - 1]?.projectRevision;
  return {
    jobs,
    model: modelId,
    estimatedCost,
    projectRevision: finalRevision ?? expectedRevision,
  };
}

type QueueCreatorSlideInput = {
  projectId: string;
  slideId: string;
  prompt: string;
  aspectRatio: "9:16" | "4:5" | "1:1" | "16:9";
  modelId: string;
  expectedRevision: number;
};

async function queueCreatorSlideImage(input: QueueCreatorSlideInput) {
  const model = getModel(input.modelId)!;
  const falInput: Record<string, unknown> = {
    prompt: input.prompt,
    num_images: 1,
    safety_tolerance: "6",
    quality: "high",
    output_format: "png",
    image_size: mapAspectRatioToFalFormat(input.aspectRatio, input.modelId),
  };

  const jobId = randomUUID();
  // Reserve and submit under a transaction so a crash never leaves a slide
  // pointed at a half-created job.
  const reservation = await prisma.$transaction(async (tx) => {
    const current = await tx.slideshowProject.findUnique({
      where: { id: input.projectId },
      select: { revision: true },
    });
    if (!current) throw new Error("Slideshow project was not found.");
    if (current.revision !== input.expectedRevision) {
      throw new Error(
        "The slideshow changed while generating visuals. Refresh and retry."
      );
    }
    const slide = await tx.slideshowSlide.findFirst({
      where: { id: input.slideId, projectId: input.projectId },
      select: { id: true },
    });
    if (!slide) throw new Error("Slideshow slide was not found.");

    const job = await tx.generationJob.create({
      data: {
        id: jobId,
        type: "image",
        model: input.modelId,
        prompt: input.prompt,
        input: {
          kind: "slideshow-slide-image",
          projectId: input.projectId,
          slideId: input.slideId,
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          falInput,
          falEndpoint: model.endpoint,
          creator: true,
        } as unknown as Prisma.InputJsonValue,
        estimatedCost: calculateEstimatedCost(input.modelId, { numImages: 1 }),
        status: "queued",
        tags: ["slideshow", `slideshow:${input.projectId}`, `slide:${input.slideId}`],
      },
    });
    await tx.slideshowSlide.update({
      where: { id: input.slideId },
      data: {
        generationJobId: job.id,
        generatedFileId: null,
        imageUrl: null,
        imagePrompt: input.prompt,
      },
    });
    await tx.slideshowProject.update({
      where: { id: input.projectId },
      data: { revision: current.revision + 1 },
    });
    return { jobId: job.id, projectRevision: current.revision + 1 };
  });

  let requestId: string;
  try {
    // Fal accepts the request; capture its id so the background poller can
    // later fetch the finished image. Without this, the job would stay
    // "queued" forever because the poller only claims jobs that carry a
    // fal request id.
    const queued = await submitToQueue(model.endpoint, falInput);
    requestId = queued.request_id?.trim();
    if (!requestId) {
      throw new Error("The image provider did not return a request id");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to queue creator image";
    await prisma.generationJob
      .update({
        where: { id: reservation.jobId },
        data: { status: "failed", error: message },
      })
      .catch(() => undefined);
    throw error;
  }

  // Mark the job as processing with the fal request id, then wake the poller
  // so the image gets written back when fal finishes.
  const marked = await prisma.generationJob.updateMany({
    where: {
      id: reservation.jobId,
      status: "queued",
      falRequestId: null,
    },
    data: {
      status: "processing",
      startedAt: new Date(),
      falRequestId: requestId,
      lockOwner: null,
      lockExpiresAt: null,
    },
  });
  if (marked.count === 1) ensurePollerRunning();

  return { ...reservation, slideId: input.slideId };
}

/* ------------------------------------------------------------------ */
/* Reference-image → template derivation (Gemini vision)               */
/* ------------------------------------------------------------------ */

const DEFAULT_VISION_MODEL = "gemini-3.6-flash";

function stripMarkdownFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The vision model returned no JSON template.");
  }
  return candidate.slice(start, end + 1);
}

function extractTemplate(text: string): SlideshowAestheticTemplate {
  const json = JSON.parse(stripMarkdownFence(text));
  return parseSlideshowAestheticTemplate(json);
}

const DERIVE_SYSTEM_PROMPT = `You are PostForge's visual director. You analyze reference images and distill them into a single structured JSON "aesthetic template" that will drive fresh image generations with GPT Image 2.

Analyze the shared visual identity across the reference images: the mood and energy, the photographic genre and realism level, lighting, color palette and temperature, composition and framing, how any subject is directed (presence, expression, body language, wardrobe, branding), the environment feel, the camera feel (depth of field, grain, sharpness, motion), and the underlying storytelling concept.

Return ONLY a single JSON object with this exact shape, and nothing else:
{
  "aesthetic": { "core_vibe": string, "mood": string[], "energy": string },
  "visual_style": { "genre": string, "realism": string, "finish": string, "inspiration": string, "avoid": string[] },
  "lighting": { "style": string, "exposure": string, "contrast": string, "highlights": string, "atmosphere": string },
  "color": { "palette": string, "dominant_tones": string[], "saturation": string, "temperature": string, "black_and_white": string },
  "composition": { "style": string, "framing": string, "posing": string, "negative_space": string, "perspective": string, "imperfection": string },
  "subject_direction": { "presence": string, "expression": string, "body_language": string, "wardrobe": string, "branding": string },
  "environment": { "feel": string, "examples": string[], "rule": string },
  "camera_feel": { "look": string, "depth_of_field": string, "texture": string, "sharpness": string, "motion": string, "dynamic_range": string },
  "storytelling": { "concept": string, "tone": string, "luxury": string }
}
Keep every value concrete and grounded in what you actually observe. Do not invent attributes that contradict the references. The core_vibe must capture the shared identity.`;

type DeriveDependencies = {
  model: string;
  apiKey: string;
  fetchImpl: typeof fetch;
};

async function defaultDeriveDependencies(): Promise<DeriveDependencies> {
  const storedKey = await getProviderCredential("gemini");
  const apiKey = storedKey?.trim() ?? process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "A Gemini key is required to derive a visual template from reference images. Connect Gemini in Settings, then retry."
    );
  }
  return {
    model: process.env.GEMINI_SLIDESHOW_MODEL?.trim() || DEFAULT_VISION_MODEL,
    apiKey,
    fetchImpl: globalThis.fetch,
  };
}

export type DeriveTemplateFromReferencesResult = {
  template: SlideshowAestheticTemplate;
  model: string;
  referenceCount: number;
};

/**
 * Send reference images (fal-storage URLs) to a vision model and derive the
 * aesthetic JSON template used to generate fresh, on-brand visuals.
 *
 * If the vision credential is missing the derivation is left unavailable and
 * reported to the caller — never silently replaced with a generic template.
 */
export async function deriveTemplateFromReferences(
  referenceUrls: string[],
  dependencies?: DeriveDependencies
): Promise<DeriveTemplateFromReferencesResult> {
  const resolvedDependencies = dependencies ?? (await defaultDeriveDependencies());
  const urls = (referenceUrls ?? [])
    .filter((url) => typeof url === "string" && /^https?:\/\//.test(url))
    .slice(0, 14);
  if (!urls.length) {
    throw new Error("At least one reference image is required.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    resolvedDependencies.model
  )}:generateContent`;
  const parts = urls.map((url) => ({ image_url: { url } }));
  const response = await resolvedDependencies.fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": resolvedDependencies.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Analyze these reference images and return the aesthetic template JSON." },
            ...parts,
          ],
        },
      ],
      system_instruction: { parts: [{ text: DERIVE_SYSTEM_PROMPT }] },
      generationConfig: {
        temperature: 0.6,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(
      `Gemini template derivation failed with HTTP ${response.status}.`
    );
  }

  const completion = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = completion.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no template.");

  const template = extractTemplate(text);
  return {
    template,
    model: resolvedDependencies.model,
    referenceCount: urls.length,
  };
}

export const slideshowCreatorLimits = {
  maxSlides: 20,
  maxReferenceImages: 14,
} as const;
