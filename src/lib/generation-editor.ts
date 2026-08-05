import { getContinuityVideoModel } from "@/lib/ai/models";

export interface JobOutput {
  id: string;
  url: string;
  type: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  fileSizeBytes: number | null;
  createdAt: string;
}

export interface JobDetail {
  id: string;
  type: "image" | "video";
  model: string;
  status: "queued" | "processing" | "completed" | "failed";
  prompt: string;
  input: Record<string, unknown>;
  output: unknown;
  estimatedCost: number;
  actualCost: number | null;
  durationMs: number | null;
  error: string | null;
  tags: string[];
  outputs: JobOutput[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

export function clampPreviewZoom(value: number) {
  return Math.min(150, Math.max(50, Math.round(value / 10) * 10));
}

export function buildGenerateSimilarHref(job: Pick<JobDetail, "prompt" | "model">) {
  return `/generate?prompt=${encodeURIComponent(job.prompt)}&model=${encodeURIComponent(job.model)}`;
}

export function buildContinueVideoHref(
  job: Pick<JobDetail, "type" | "prompt" | "model">,
  outputId?: string
) {
  if (job.type !== "video") {
    throw new Error("Only video outputs can seed a continued generation.");
  }
  const continuityModel = getContinuityVideoModel();
  const params = new URLSearchParams();
  params.set("prompt", job.prompt);
  params.set("model", continuityModel?.id ?? job.model);
  if (outputId) params.set("referenceFileId", outputId);
  return `/generate?${params.toString().replace(/\+/g, "%20")}`;
}

export function buildCloneHandoffHref(outputId?: string) {
  return outputId
    ? `/ugc-clone?referenceFileId=${encodeURIComponent(outputId)}`
    : "/ugc-clone";
}

export function buildEnhancementRequest({
  job,
  outputId,
  instruction,
  editStrength,
  preserveSubject,
}: {
  job: Pick<JobDetail, "type" | "prompt" | "model" | "input">;
  outputId: string;
  instruction: string;
  editStrength: number;
  preserveSubject: boolean;
}) {
  if (job.type !== "image") {
    throw new Error("Only image outputs can be enhanced in the editor.");
  }

  const preserveInstruction = preserveSubject
    ? "Preserve the subject identity, expression, product, and camera geometry."
    : "The subject and composition may change when needed.";

  const sourceModel = asString(job.model);
  const editModel =
    sourceModel && sourceModel.startsWith("nano-banana")
      ? sourceModel
      : "nano-banana-2";

  return {
    prompt: [
      job.prompt,
      `Edit instruction: ${instruction.trim()}`,
      preserveInstruction,
      `Apply the change at approximately ${Math.min(100, Math.max(0, editStrength))}% strength.`,
    ].join("\n\n"),
    model: editModel,
    aspectRatio: asString(job.input.aspectRatio) ?? "9:16",
    numImages: 1,
    negativePrompt: asString(job.input.negativePrompt),
    referenceFileIds: [outputId],
    editEndpoint: true,
  };
}

export function getGenerationStatusCopy(status: JobDetail["status"]) {
  if (status === "queued") {
    return {
      label: "Queued",
      title: "Queued for generation",
      description: "Your settings are saved. Processing will begin automatically.",
    };
  }
  if (status === "processing") {
    return {
      label: "Processing",
      title: "Creating your asset",
      description: "Building composition, texture, and production detail.",
    };
  }
  if (status === "failed") {
    return {
      label: "Failed",
      title: "Generation stopped",
      description: "Your prompt and settings are still available for retry.",
    };
  }
  return {
    label: "Completed",
    title: "Generation complete",
    description: "Review the outputs and choose the strongest variation.",
  };
}
