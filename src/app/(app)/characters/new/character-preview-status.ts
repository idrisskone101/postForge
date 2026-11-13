export type PreviewStatus = {
  tone: "live" | "warn" | "ok" | "neutral";
  label: string;
};

export function previewStatus(
  rendering: boolean,
  previewSaveBlocked: boolean,
  previewRequiresRender: boolean
): PreviewStatus {
  if (rendering) return { tone: "live", label: "Rendering" };
  if (previewSaveBlocked) return { tone: "warn", label: "Changes not rendered" };
  if (previewRequiresRender) return { tone: "ok", label: "Preview ready" };
  return { tone: "neutral", label: "Draft, preview optional" };
}
