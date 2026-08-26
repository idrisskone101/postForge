import type { ComponentType } from "react";
import { Expand, ImageUpscale, Paintbrush, Sparkles } from "lucide-react";
import type { JobDetail, JobOutput } from "@/lib/generation-editor";

export type InspectorTab = "enhance" | "details" | "prompts";
export type JobFeedback = { tone: "success" | "error"; message: string } | null;

export interface EnhancementTool {
  id: "upscale" | "relight" | "remove-object" | "expand-frame";
  title: string;
  detail: string;
  instruction: string;
  icon: ComponentType<{ className?: string }>;
}

export const ENHANCEMENT_TOOLS: EnhancementTool[] = [
  {
    id: "upscale",
    title: "Upscale",
    detail: "Increase detail while preserving texture",
    instruction: "Increase fine detail and resolution without smoothing skin or changing composition.",
    icon: ImageUpscale,
  },
  {
    id: "relight",
    title: "Relight",
    detail: "Balance subject and product lighting",
    instruction: "Balance the subject and product lighting while keeping the scene natural.",
    icon: Sparkles,
  },
  {
    id: "remove-object",
    title: "Remove object",
    detail: "Describe a distracting object to remove",
    instruction: "Remove the distracting object while reconstructing the background naturally.",
    icon: Paintbrush,
  },
  {
    id: "expand-frame",
    title: "Expand frame",
    detail: "Recompose with more space around the subject",
    instruction: "Expand the frame naturally and preserve the subject scale and camera perspective.",
    icon: Expand,
  },
];

export function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

export function getEditorTitle(prompt: string) {
  const clean = prompt.replace(/\s+/g, " ").trim();
  if (!clean) return "Untitled generation";
  return clean.length > 52 ? `${clean.slice(0, 52).trim()}…` : clean;
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
  onGallery: () => void;
  onDownload: () => void;
  onRetry: () => void;
  onGenerateSimilar: () => void;
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
