/**
 * Client-safe types for the Slideshow Creator aesthetic template.
 *
 * Kept dependency-free so it can be imported from both the server creator
 * library (`slideshow-creator.ts`) and client UI components. See
 * `slideshow-creator.ts` for parsing/validation and prompt building.
 */

/** Per-slide mutable scene. Kept separate so the core aesthetic stays fixed. */
export interface SlideshowCreatorScene {
  /** Automatically assigned deck-level variety lane. */
  archetype?: string;
  /** Location / environment for this specific slide (e.g. "a dark boxing gym"). */
  location?: string;
  /** Activity / subject behaviour for this slide. */
  activity?: string;
  /** Optional explicit subject descriptor overriding subject_direction. */
  subject?: string;
}

export interface SlideshowCreatorSlideInput {
  slideId: string;
  /** The on-slide text (headline/body) the generated image must make sense with. */
  text: string;
  /** Optional per-slide scene variation. */
  scene?: SlideshowCreatorScene;
}

export interface SlideshowAestheticTemplate {
  aesthetic: {
    core_vibe: string;
    mood: string[];
    energy?: string;
  };
  visual_style: {
    genre: string;
    realism: string;
    finish?: string;
    inspiration?: string;
    avoid?: string[];
  };
  lighting?: {
    style?: string;
    exposure?: string;
    contrast?: string;
    highlights?: string;
    atmosphere?: string;
  };
  color?: {
    palette?: string;
    dominant_tones?: string[];
    saturation?: string;
    temperature?: string;
    black_and_white?: string;
  };
  composition?: {
    style?: string;
    framing?: string;
    posing?: string;
    negative_space?: string;
    perspective?: string;
    imperfection?: string;
  };
  subject_direction?: {
    presence?: string;
    expression?: string;
    body_language?: string;
    wardrobe?: string;
    branding?: string;
  };
  environment?: {
    feel?: string;
    examples?: string[];
    rule?: string;
  };
  camera_feel?: {
    look?: string;
    depth_of_field?: string;
    texture?: string;
    sharpness?: string;
    motion?: string;
    dynamic_range?: string;
  };
  storytelling?: {
    concept?: string;
    tone?: string;
    luxury?: string;
  };
}

export interface SlideshowCreatorVisualsResult {
  jobs: Array<{ slideId: string; jobId: string; estimatedCost: number }>;
  model: string;
  estimatedCost: number;
  projectRevision: number;
}
