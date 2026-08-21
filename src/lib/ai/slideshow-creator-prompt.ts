import type {
  SlideshowAestheticTemplate,
  SlideshowCreatorScene,
  SlideshowCreatorSlideInput,
} from "./slideshow-creator-types";

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
