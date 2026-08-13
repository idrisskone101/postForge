export type JobPresentationRecord = {
  id: string;
  type: string;
  status: string;
  queueStage?: string | null;
  tags?: string[];
  input?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function hasTag(job: JobPresentationRecord, tag: string) {
  return job.tags?.includes(tag) === true;
}

export function getJobActivityLabel(job: JobPresentationRecord): string {
  if (hasTag(job, "ugc-clone-ref")) return "Reference image";
  if (hasTag(job, "ugc-clone")) return "UGC clone";
  if (hasTag(job, "slideshow")) return "Slideshow image";
  if (hasTag(job, "avatar-identity-hairstyles")) return "Hairstyle references";
  if (hasTag(job, "avatar-identity")) return "Identity image set";
  if (hasTag(job, "character-video")) return "Character video";
  if (hasTag(job, "character-preview")) return "Character preview";
  if (hasTag(job, "generate-avatar")) return "Character image";
  if (hasTag(job, "video-swap")) return "Video swap";
  return job.type === "video" ? "Video generation" : "Image generation";
}

export function getJobDestination(job: JobPresentationRecord): string {
  if (hasTag(job, "ugc-clone")) return `/ugc-clone/${encodeURIComponent(job.id)}`;
  if (hasTag(job, "slideshow")) return "/slideshow";
  if (hasTag(job, "avatar-identity") || hasTag(job, "avatar-identity-hairstyles")) {
    const avatarId = asString(asRecord(job.input)?.avatarId);
    return avatarId
      ? `/characters?avatarId=${encodeURIComponent(avatarId)}`
      : "/characters";
  }
  return `/generate/${encodeURIComponent(job.id)}`;
}

export function getJobStatusLabel(job: JobPresentationRecord): string {
  if (job.status === "completed") return "Completed";
  if (job.status === "failed") return "Failed";
  if (job.status === "queued") return "Queued";

  const stage = job.queueStage;
  if (stage === "preparing") return "Preparing";
  if (stage === "submitted") return "Generating";
  if (stage === "downloading") return "Saving output";
  return "Processing";
}

export function isActiveGenerationJob(job: Pick<JobPresentationRecord, "status">) {
  return job.status === "queued" || job.status === "processing";
}
