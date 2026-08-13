import { randomUUID } from "crypto";

import { submitToQueue } from "./fal-client";
import { ensurePollerRunning } from "@/lib/jobs/poller";
import {
  calculateEstimatedCost,
  getModel,
  mapAspectRatioToFalFormat,
} from "./models";
import { getProviderCredential } from "@/lib/providers/credentials";
import { getDefaultVisionIntelligenceModel } from "./model-availability";
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
 * the mutable scene (environment, activity, lifestyle archetype) so every image
 * stays on-brand while remaining distinct. When the operator does not assign
 * scenes manually, a deck-level planner deliberately spreads the slides across
 * everyday, public, travel, and aspirational lifestyle moments.
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

type PlannedScene = Required<
  Pick<SlideshowCreatorScene, "archetype" | "location" | "activity">
>;

/**
 * These are creative lanes, not literal scene suggestions. The image model
 * resolves each lane into a specific environment and action using the slide's
 * meaning plus the frozen aesthetic. This gives the deck structural variety
 * without hard-coding cars, planes, libraries, houses, or any other prop.
 */
const SCENE_ARCHETYPE_PORTFOLIO: PlannedScene[] = [
  {
    archetype: "practice-and-discipline",
    location:
      "Invent a concrete environment where this subject would credibly practice, train, rehearse, or improve a skill within the supplied aesthetic.",
    activity:
      "Choose one specific in-progress action with physical detail; capture effort or concentration instead of a pose.",
  },
  {
    archetype: "movement-and-transition",
    location:
      "Invent a concrete environment built around movement, transit, arrival, departure, or a change of place that fits this subject's world.",
    activity:
      "Choose one specific transitional action that makes the journey legible without turning it into travel advertising.",
  },
  {
    archetype: "work-and-craft",
    location:
      "Invent a concrete working or making environment with distinctive tools, materials, architecture, or lived-in detail appropriate to the aesthetic.",
    activity:
      "Show one specific act of building, reviewing, preparing, repairing, or deciding rather than generic laptop use.",
  },
  {
    archetype: "social-and-cultural",
    location:
      "Invent a concrete public, social, or cultural environment that naturally belongs in this subject's life and visually differs from private interiors.",
    activity:
      "Choose one candid interaction, observation, entrance, exit, or between-moments gesture; avoid staged group posing.",
  },
  {
    archetype: "outdoor-and-exploration",
    location:
      "Invent a specific outdoor environment with a strong sense of place, weather, scale, and time of day that preserves the aesthetic base.",
    activity:
      "Choose one grounded action involving the terrain, weather, route, or surroundings rather than simply standing in scenery.",
  },
  {
    archetype: "private-and-restorative",
    location:
      "Invent a specific private or restorative environment with personal, imperfect details; do not default to a generic living room or bedroom.",
    activity:
      "Choose one quiet ritual, reset, preparation, or reflection moment with something visibly happening.",
  },
  {
    archetype: "reward-and-milestone",
    location:
      "Invent a concrete environment that communicates progress, reward, access, or a milestone at the level of aspiration supported by the aesthetic—never inject status or luxury when it does not fit.",
    activity:
      "Show the subject naturally experiencing or moving through the result, not displaying possessions to the camera.",
  },
  {
    archetype: "unexpected-everyday",
    location:
      "Invent a believable but visually unexpected everyday environment that has not become a stock default for this subject or aesthetic.",
    activity:
      "Choose a precise ordinary action with an unusual visual angle, object interaction, or moment of timing.",
  },
];

function templateSignals(template: SlideshowAestheticTemplate) {
  return [
    template.aesthetic.core_vibe,
    ...(template.aesthetic.mood ?? []),
    template.aesthetic.energy,
    template.visual_style.genre,
    template.visual_style.finish,
    template.environment?.feel,
    ...(template.environment?.examples ?? []),
    template.environment?.rule,
    template.storytelling?.concept,
    template.storytelling?.tone,
    template.storytelling?.luxury,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function stableSceneHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Assign a deliberately broad scene portfolio to a deck. Explicit per-slide
 * directions always win. The aesthetic and copy deterministically shuffle the
 * lanes, so different decks do not all repeat the same sequence while retries
 * of the same deck remain stable.
 */
export function planSlideshowCreatorScenes(
  template: SlideshowAestheticTemplate,
  slides: SlideshowCreatorSlideInput[]
): SlideshowCreatorSlideInput[] {
  const seed = `${templateSignals(template)} ${slides
    .map((slide) => slide.text)
    .join(" ")}`;
  const portfolio = [...SCENE_ARCHETYPE_PORTFOLIO].sort(
    (left, right) =>
      stableSceneHash(`${seed}:${left.archetype}`) -
      stableSceneHash(`${seed}:${right.archetype}`)
  );

  return slides.map((slide, index) => {
    const planned =
      portfolio[index % portfolio.length] ?? SCENE_ARCHETYPE_PORTFOLIO[0];
    const operatorDirected = Boolean(
      slide.scene?.location?.trim() || slide.scene?.activity?.trim()
    );
    return {
      ...slide,
      scene: {
        archetype: operatorDirected
          ? slide.scene?.archetype?.trim() || "operator-directed"
          : planned.archetype,
        location: slide.scene?.location?.trim() || planned.location,
        activity: slide.scene?.activity?.trim() || planned.activity,
        subject: slide.scene?.subject?.trim() || undefined,
      },
    };
  });
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
    const direction = [
      template.environment.feel,
      template.environment.rule,
    ].filter(Boolean);
    if (direction.length) {
      blocks.push(`ENVIRONMENT AESTHETIC: ${direction.join("; ")}`);
    }
    if (template.environment.examples?.length) {
      blocks.push(
        `REFERENCE ENVIRONMENTS (inspiration only, not an exhaustive list): ${template.environment.examples.join(
          "; "
        )}`
      );
    }
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
    `SCENE ARCHETYPE: ${scene.archetype?.trim() || "operator-directed"}`,
    `ENVIRONMENT DECISION: ${scene.location?.trim() || "Choose one concrete environment that fits the copy and aesthetic."}`,
    `ACTIVITY DECISION: ${scene.activity?.trim() || "Choose one specific, candid activity that fits the copy and environment."}`
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
    assigned_scene: {
      subject,
      archetype: scene.archetype?.trim() || "operator-directed",
      environment_brief: scene.location?.trim() || null,
      activity_brief: scene.activity?.trim() || null,
      mandatory: true,
      resolve_to_one_concrete_environment: true,
      resolve_to_one_specific_activity: true,
      direction:
        "Make the creative decisions yourself. Honor the assigned archetype, resolve both briefs into one concrete and believable moment, and do not fall back to a stock house, library, office, or studio unless the archetype genuinely calls for it.",
    },
    deck_variety: {
      keep_aesthetic_base_fixed: true,
      vary_environment_and_activity: true,
      environment_examples_are_inspiration_not_limits: true,
      instruction:
        "Treat this as one frame in a deck whose other frames use different lifestyle archetypes. Make this frame's environment and action unmistakable while preserving the shared person and aesthetic.",
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
    archetype: stringOr(raw.archetype),
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
  const slides = planSlideshowCreatorScenes(
    template,
    (input.slides ?? []).map(slideInputFrom)
  );
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
/* Reference-image → template derivation (Ollama vision)               */
/* ------------------------------------------------------------------ */

const OLLAMA_CHAT_URL = "https://ollama.com/v1/chat/completions";

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
  const storedKey = await getProviderCredential("ollama");
  const apiKey = storedKey?.trim() ?? process.env.OLLAMA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "An Ollama connection is required to derive a visual template from reference images. Connect Ollama in Settings, then retry."
    );
  }
  const visionModel = await getDefaultVisionIntelligenceModel();
  if (!visionModel) {
    throw new Error(
      "No vision-capable intelligence model is available. Add one to the story model catalog."
    );
  }
  return {
    model: visionModel.ollamaId,
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

  const endpoint = OLLAMA_CHAT_URL;
  const imageParts = urls.map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));
  const response = await resolvedDependencies.fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolvedDependencies.apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedDependencies.model,
      messages: [
        { role: "system", content: DERIVE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze these reference images and return the aesthetic template JSON.",
            },
            ...imageParts,
          ],
        },
      ],
      temperature: 0.6,
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(
      `Template derivation failed with HTTP ${response.status}.`
    );
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = completion.choices?.[0]?.message?.content;
  if (!text) throw new Error("The vision model returned no template.");

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
