import { MODEL_REGISTRY } from "@/lib/ai/model-registry";

export type CloneJobLabel = {
  /** The source label when the job stored one. */
  source: string | null;
  /** First 8 characters of the job id, shown in mono after "Clone" when there is no source label. */
  shortId: string;
  sub: string;
};

/**
 * A clone job's stored prompt is the same boilerplate on every row, so the row
 * is named by its source video instead.
 */
export function cloneJobLabel(job: {
  id: string;
  model: string;
  input?: unknown;
}): CloneJobLabel {
  const input = isRecord(job.input) ? job.input : {};
  const source =
    readLabel(input.sourceVideo) ?? readLabel(input.sourceVideoSnapshot);
  const identity = typeof input.identityName === "string" ? input.identityName.trim() : "";
  const model = MODEL_REGISTRY[job.model]?.name ?? job.model;
  return {
    source,
    shortId: job.id.slice(0, 8),
    sub: identity ? `${identity} · ${model}` : model,
  };
}

function readLabel(value: unknown): string | null {
  if (!isRecord(value) || typeof value.label !== "string") return null;
  return value.label.trim() || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
