import { promptTitle } from "@/lib/ai/prompt-presentation";
import type { JobDetail, JobOutput } from "@/lib/generation-editor";

export type JobIconName =
  | "share"
  | "zoom-out"
  | "zoom-in"
  | "crop"
  | "fullscreen"
  | "upscale"
  | "relight"
  | "remove-object"
  | "expand-frame"
  | "copy"
  | "retry";
export type JobFeedback = { tone: "success" | "error"; message: string } | null;

export interface EnhancementTool {
  id: "upscale" | "relight" | "remove-object" | "expand-frame";
  title: string;
  instruction: string;
  icon: JobIconName;
}

export const ENHANCEMENT_TOOLS: EnhancementTool[] = [
  {
    id: "upscale",
    title: "Upscale",
    instruction: "Increase fine detail and resolution without smoothing skin or changing composition.",
    icon: "upscale",
  },
  {
    id: "relight",
    title: "Relight",
    instruction: "Balance the subject and product lighting while keeping the scene natural.",
    icon: "relight",
  },
  {
    id: "remove-object",
    title: "Remove object",
    instruction: "Remove the distracting object while reconstructing the background naturally.",
    icon: "remove-object",
  },
  {
    id: "expand-frame",
    title: "Expand frame",
    instruction: "Expand the frame naturally and preserve the subject scale and camera perspective.",
    icon: "expand-frame",
  },
];

export function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

export function getEditorTitle(prompt: string) {
  return promptTitle(prompt, 72) || "Untitled generation";
}

export function jobDetailFlags(job: JobDetail) {
  return {
    isActive: job.status === "queued" || job.status === "processing",
    isCompleted: job.status === "completed",
    canDiscard: job.status === "completed" || job.status === "failed",
    isFailed: job.status === "failed",
  };
}

export interface JobDetailViewModel {
  job: JobDetail;
  featured: JobOutput | undefined;
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  canDiscard: boolean;
  isRetrying: boolean;
  isDownloading: boolean;
  isDiscarding: boolean;
  isApplying: boolean;
  cropMode: boolean;
  previewZoom: number;
  selectedEnhancement: EnhancementTool["id"];
  enhancementInstruction: string;
  editStrength: number;
  preserveSubject: boolean;
  feedback: JobFeedback;
  error: Error | null;
}

export interface JobDetailActions {
  onBack: () => void;
  onShare: () => void;
  onDownload: () => void;
  onRetry: () => void;
  onGenerateSimilar: () => void;
  onContinueVideo: () => void;
  onCopyPrompt: () => void;
  onSelectTool: (id: EnhancementTool["id"]) => void;
  onInstructionChange: (value: string) => void;
  onEditStrengthChange: (value: number) => void;
  onPreserveSubjectChange: (value: boolean) => void;
  onApply: () => void;
  onSaveToGallery: () => void;
  onUseInClone: () => void;
  onAddToAutomation: () => void;
  onDiscard: () => void;
  onLeave: () => void;
}

export interface JobPreviewToolbarView {
  previewZoom: number;
  cropMode: boolean;
  isFullscreen: boolean;
  isCompleted: boolean;
  featured: JobOutput | undefined;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onToggleCrop: () => void;
  onFullscreen: () => void;
}
