export type SlideshowSection = "create" | "drafts";

type SlideshowAestheticTemplate = import("@/lib/ai/slideshow-creator-types").SlideshowAestheticTemplate;

export type SlideshowPhase = "hook" | "body" | "cta";
export type SlideshowAspectRatio = "9:16" | "4:5" | "1:1" | "16:9";

export type SlideshowGrid = "none" | "1:2" | "1:3" | "2:1" | "2:2";

export type SlideshowTextStyle =
  | "outline"
  | "solid"
  | "light"
  | "translucent"
  | "plain";

export type SlideshowTextPosition = "top" | "center" | "bottom";

export type SlideshowTextAlign = "left" | "center" | "right";

export type SlideshowProjectStatus =
  | "draft"
  | "generating"
  | "ready"
  | "scheduled"
  | "published"
  | "archived"
  | "exported"
  | "failed";

export interface SlideshowSlide {
  id: string;
  /** Stable client correlation key used while local slide ids become server ids. */
  clientId?: string;
  order: number;
  role: SlideshowPhase;
  eyebrow: string;
  headline: string;
  body: string;
  prompt: string;
  visualKey: string;
  /** Ordered visual placeholders used by multi-cell grids. */
  visualKeys?: string[];
  imageUrl?: string | null;
  /** Ordered image URLs used by multi-cell grids. */
  imageUrls?: string[];
}

export type SlideshowImageGenerationResult = Partial<SlideshowSlide> & {
  projectRevision?: number;
  generatedFileId?: string;
};

export interface SlideshowPhaseSettings {
  grid: SlideshowGrid;
  overlayEnabled: boolean;
  overlayOpacity: number;
  displayText: boolean;
}

export interface SlideshowTextSettings {
  font:
    | "Poppins"
    | "Inter"
    | "Serif"
    | "SerifItalic"
    | "Editorial"
    | "Condensed"
    | "Mono"
    | "Rounded";
  color: "white" | "black" | "coral" | "blue" | "yellow" | "custom";
  customColor?: string;
  style: SlideshowTextStyle;
  size: number;
  position: SlideshowTextPosition;
  width: number;
  align: SlideshowTextAlign;
  padding: "padded" | "flush";
  backgroundRadius: number;
}

export interface SlideshowProject {
  id: string;
  /** Stable client correlation key while a local project receives a server id. */
  clientId?: string;
  title: string;
  description?: string;
  /** Ready-to-post social caption, kept separate from the internal project brief. */
  caption?: string;
  generationProvider?: "ollama" | "local-fallback";
  generationModel?: string | null;
  generationWarning?: string;
  status: SlideshowProjectStatus;
  revision?: number;
  aspectRatio: SlideshowAspectRatio;
  slides: SlideshowSlide[];
  phaseSettings: Record<SlideshowPhase, SlideshowPhaseSettings>;
  textSettings: SlideshowTextSettings;
  includeCta: boolean;
  preventRepeats: boolean;
  language: string;
  templateId?: string | null;
  /** Slideshow Creator visual direction persisted on the project settings. */
  creator?: {
    template?: SlideshowAestheticTemplate | null;
    updatedAt?: string;
  } | null;
  /** Server-recorded successful render/download attempts. */
  successfulExportCount?: number;
  lastExportedAt?: string | null;
  exportHistory?: string[];
  createdAt?: string;
  updatedAt: string;
}

export interface SlideshowTemplate {
  id: string;
  name: string;
  author: string;
  category: string;
  description: string;
  hook: string;
  visualKeys: [string, string, string];
  slides: Array<
    Pick<
      SlideshowSlide,
      "role" | "eyebrow" | "headline" | "body" | "prompt" | "visualKey"
    >
  >;
}

export interface SlideshowAutomation {
  id: string;
  name: string;
  cadence: string;
  status: "active" | "paused" | "archived";
  revision?: number;
  nextRunAt?: string | null;
  projectId?: string | null;
  visualKey?: string;
  hooks?: string[];
  weekdays?: string[];
  time?: string;
  timezone?: string;
  visualPolicy?: "reuse" | "fresh-ai";
  imageCollectionId?: string | null;
  imageModel?: string;
  /** Server-recorded runs that successfully created a review draft. */
  successfulRunCount?: number;
  lastRunAt?: string | null;
  runHistory?: string[];
}

export interface SlideshowCollection {
  id: string;
  name: string;
  imageCount: number;
  visualKeys: string[];
  imageUrls?: string[];
  sourceUrls?: string[];
  revision?: number;
}

export interface SlideshowPublishOptions {
  format: "photo-carousel" | "mp4";
  destination: "download" | "tiktok-direct" | "tiktok-draft";
  caption: string;
  visibility: "public" | "friends" | "private";
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  brandedContent: boolean;
  aiGenerated: boolean;
  scheduledFor?: string | null;
}

export interface SlideshowStudioProps {
  initialProjects?: SlideshowProject[];
  initialProject?: SlideshowProject | null;
  initialSection?: SlideshowSection;
  initialCollections?: SlideshowCollection[];
  templates?: SlideshowTemplate[];
  apiBaseUrl?: string;
  className?: string;
  tiktokConnected?: boolean;
  supportsMp4Export?: boolean;
  onSaveProject?: (
    project: SlideshowProject,
  ) => Promise<SlideshowProject | void>;
  onRegenerateSlide?: (
    project: SlideshowProject,
    slide: SlideshowSlide,
  ) => Promise<SlideshowProject | Partial<SlideshowSlide> | void>;
  onRegenerateImage?: (
    project: SlideshowProject,
    slide: SlideshowSlide,
    onQueuedRevision: (revision: number) => void,
  ) => Promise<SlideshowImageGenerationResult | void>;
  onExportProject?: (
    project: SlideshowProject,
    options: SlideshowPublishOptions,
  ) => Promise<void>;
}

export function isLocalSlideshowId(id: string) {
  return id.startsWith("local-");
}
