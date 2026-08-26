export function previewStatusLabel(
  rendering: boolean,
  previewSaveBlocked: boolean,
  previewRequiresRender: boolean
): string {
  if (rendering) return "Rendering";
  if (previewSaveBlocked) return "Changes pending";
  if (previewRequiresRender) return "Preview ready";
  return "Draft — preview optional";
}

export function previewStatusClass(
  rendering: boolean,
  previewSaveBlocked: boolean,
  previewRequiresRender: boolean
): string {
  if (rendering) return "pf-status-warning";
  if (previewSaveBlocked) return "pf-status-warning";
  if (previewRequiresRender) return "pf-status-success";
  return "bg-white/10 text-white/80";
}

export type PreviewStatusIcon = "loading" | "refresh" | "check";

export function previewStatusIcon(
  rendering: boolean,
  previewSaveBlocked: boolean
): PreviewStatusIcon {
  if (rendering) return "loading";
  if (previewSaveBlocked) return "refresh";
  return "check";
}
