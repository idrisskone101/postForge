import { MODEL_REGISTRY } from "@/lib/ai/model-registry";
import { summarizeGenerationPrompt } from "@/lib/ai/prompt-presentation";
import { getJobActivityLabel } from "@/lib/jobs/presentation";
import type { HomeJob, HomeMedia, HomeReviewItem } from "./home-types";

export function homeJobTitle(job: Pick<HomeJob, "id" | "type" | "status" | "tags" | "prompt">) {
  return promptTitle(job.prompt) || getJobActivityLabel(job);
}

/** A short title from a prompt. Structured identity prompts carry their sentence in `task`. */
export function promptTitle(prompt: string) {
  return summarizeGenerationPrompt(structuredTask(prompt) ?? prompt);
}

function structuredTask(prompt: string) {
  if (!prompt.trimStart().startsWith("{")) return null;
  try {
    const parsed: unknown = JSON.parse(prompt);
    const task = (parsed as { task?: unknown } | null)?.task;
    return typeof task === "string" && task.trim() ? task : null;
  } catch {
    return null;
  }
}

export function modelName(model: string) {
  return MODEL_REGISTRY[model]?.name ?? model;
}

/** Age relative to the request time, so server and client render the same text. */
export function formatAge(date: Date, now: Date) {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function toReviewItems(jobs: HomeJob[], now: Date): HomeReviewItem[] {
  return jobs.flatMap((job) => {
    if (!job.output) return [];
    const who = job.productionContext?.identityDetail ?? modelName(job.model);
    return [
      {
        outputId: job.output.id,
        href: reviewHref(job),
        title: homeJobTitle(job),
        meta: `${who} - ${formatAge(job.output.createdAt ?? job.createdAt, now)}`,
        mediaType: job.type === "video" ? "video" : "image",
      },
    ];
  });
}

function reviewHref(job: HomeJob) {
  const isClone = job.type === "video" && job.tags?.includes("ugc-clone") === true;
  return isClone ? `/ugc-clone/${job.id}` : `/generate/${job.id}`;
}

export function mediaHref(media: HomeMedia) {
  return media.isClone ? `/ugc-clone/${media.jobId}` : `/generate/${media.jobId}`;
}

export const REVIEW_BADGE: Record<string, { tone: "ok" | "warn" | "bad"; label: string }> = {
  approved_output: { tone: "ok", label: "Approved" },
  rejected_output: { tone: "bad", label: "Rejected" },
  needs_review: { tone: "warn", label: "Needs review" },
};

/** The queue stages a running job passes through, in order. */
const STAGE_STEP: Record<string, number> = { preparing: 1, submitted: 2, downloading: 3 };
export const STAGE_COUNT = 3;

export function stageStep(queueStage: string | null | undefined) {
  return (queueStage && STAGE_STEP[queueStage]) || 1;
}
