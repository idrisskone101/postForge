import type {
  SlideshowProject,
  SlideshowSlide,
} from "@/lib/slideshow/project";

export type {
  SlideshowAspectRatio,
  SlideshowGrid,
  SlideshowKindSettings,
  SlideshowProject,
  SlideshowProjectStatus,
  SlideshowSlide,
  SlideshowSlideKind,
  SlideshowTextAlign,
  SlideshowTextPosition,
  SlideshowTextSettings,
  SlideshowTextStyle,
} from "@/lib/slideshow/project";
export {
  isLocalSlideshowId,
  parseSlideshowProject,
  slideKindFromUnknown,
  slideshowProjectWriteBody,
} from "@/lib/slideshow/project";

export type SlideshowSection = "create" | "drafts";
export type SlideshowViewMode = "edit" | "board" | "play";

export type SlideshowImageGenerationResult = Partial<SlideshowSlide> & {
  projectRevision?: number;
  generatedFileId?: string;
};

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
      "kind" | "eyebrow" | "headline" | "body" | "prompt" | "visualKey"
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
  initialViewMode?: SlideshowViewMode;
}
