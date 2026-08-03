export const SLIDESHOW_AUTOMATION_VISUAL_POLICIES = [
  "reuse",
  "fresh-ai",
] as const;

export type SlideshowAutomationVisualPolicy =
  (typeof SLIDESHOW_AUTOMATION_VISUAL_POLICIES)[number];

export type SlideshowAutomationVisualSettings = {
  policy: SlideshowAutomationVisualPolicy;
  imageCollectionId?: string;
  imageModel: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads persisted automation visual settings with a deliberately safe default.
 * Unknown and legacy values always reuse existing visuals and therefore never
 * start a paid image-generation request.
 */
export function readSlideshowAutomationVisualSettings(
  value: unknown,
): SlideshowAutomationVisualSettings {
  const settings = isRecord(value) ? value : {};
  const policy =
    settings.visualPolicy === "fresh-ai" ? "fresh-ai" : "reuse";
  const imageCollectionId =
    typeof settings.imageCollectionId === "string" &&
    settings.imageCollectionId.trim()
      ? settings.imageCollectionId.trim()
      : undefined;
  const imageModel =
    typeof settings.imageModel === "string" && settings.imageModel.trim()
      ? settings.imageModel.trim()
      : "nano-banana-2";

  return {
    policy,
    ...(imageCollectionId ? { imageCollectionId } : {}),
    imageModel,
  };
}

export function shouldGenerateFreshAutomationVisuals(value: unknown) {
  return readSlideshowAutomationVisualSettings(value).policy === "fresh-ai";
}
