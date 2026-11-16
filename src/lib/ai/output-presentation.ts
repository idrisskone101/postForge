import { MODEL_REGISTRY } from "@/lib/ai/model-registry";
import { promptTitle } from "@/lib/ai/prompt-presentation";

type OutputType = "image" | "video";

export function modelDisplayName(model: string) {
  return MODEL_REGISTRY[model]?.name ?? model;
}

/** The title of an output everywhere it is listed: its prompt summary, or the model when there is no prompt. */
export function outputTitle(output: { prompt?: string | null; model: string }) {
  return promptTitle(output.prompt) || modelDisplayName(output.model);
}

/** "Image - Nano Banana 2 - Aug 19": type, who or what made it, when. */
export function outputMeta(type: OutputType, madeBy: string, when: string) {
  return [type === "video" ? "Video" : "Image", madeBy, when].filter(Boolean).join(" - ");
}

export function formatOutputDate(createdAt: string | Date, now = new Date()) {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** Title plus date and time, so a grid of outputs from one prompt does not read as identical names. */
export function outputAccessibleName(
  output: { prompt?: string | null; model: string; createdAt: string | Date },
) {
  const date = output.createdAt instanceof Date ? output.createdAt : new Date(output.createdAt);
  const when = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });
  return [outputTitle(output), when].filter(Boolean).join(", ");
}
