import { MODEL_REGISTRY } from "@/lib/ai/model-registry";
import { summarizeGenerationPrompt } from "@/lib/ai/prompt-presentation";
import type { OutputReviewStatus } from "@/lib/output-review-status";
import type { StatusTone } from "@/components/workbench/status-badge";
import type { GalleryItem } from "./types";

export function galleryItemTitle(item: Pick<GalleryItem, "model">) {
  return MODEL_REGISTRY[item.model]?.name ?? item.model;
}

export function galleryItemKind(item: Pick<GalleryItem, "type" | "width" | "height">) {
  const noun = item.type === "video" ? "Video" : "Image";
  const ratio = aspectRatio(item.width, item.height);
  return ratio ? `${noun}, ${ratio}` : noun;
}

export function galleryItemSize(item: Pick<GalleryItem, "width" | "height">) {
  return item.width && item.height ? `${item.width} x ${item.height}` : "-";
}

export function formatGalleryDuration(seconds: number | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return undefined;
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function formatGalleryCreated(createdAt: string | Date) {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export const reviewStatusTone: Record<OutputReviewStatus, StatusTone> = {
  needs_review: "warn",
  approved_output: "ok",
  rejected_output: "bad",
};

export const reviewStatusLabel: Record<OutputReviewStatus, string> = {
  needs_review: "Needs review",
  approved_output: "Approved",
  rejected_output: "Rejected",
};

export function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function galleryPromptSummary(prompt: string | undefined, maxLength = 180) {
  if (!prompt?.trim()) return "";
  if (!prompt.trimStart().startsWith("{")) return summarizeGenerationPrompt(prompt, maxLength);
  try {
    const parsed: unknown = JSON.parse(prompt);
    const record = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    const lead = PROMPT_LEAD_KEYS.map((key) => record[key]).find(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );
    return lead ? summarizeGenerationPrompt(lead, maxLength) : "";
  } catch {
    return summarizeGenerationPrompt(prompt, maxLength);
  }
}

const PROMPT_LEAD_KEYS = ["on_slide_text", "intent", "task", "objective", "description"];

function aspectRatio(width?: number, height?: number) {
  if (!width || !height) return undefined;
  let a = width;
  let b = height;
  while (b > 0) [a, b] = [b, a % b];
  const w = width / a;
  const h = height / a;
  return w <= 32 && h <= 32 ? `${w}:${h}` : undefined;
}
