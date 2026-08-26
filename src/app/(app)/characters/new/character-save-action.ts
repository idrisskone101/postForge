export function characterSaveAction(input: {
  saving: boolean;
  rendering: boolean;
  missingEditRecord: boolean;
  previewSaveBlocked: boolean;
  readyPreviewFingerprint: string | null;
}): { label: string; title: string | undefined } {
  if (input.saving) return { label: "Saving…", title: undefined };
  if (input.rendering) {
    return {
      label: "Rendering…",
      title: "Wait for the preview render to finish",
    };
  }
  if (input.missingEditRecord) return { label: "Unavailable", title: undefined };
  if (input.previewSaveBlocked) {
    return {
      label: "Preview changed",
      title: "Re-render the photographic preview before saving",
    };
  }
  if (input.readyPreviewFingerprint) return { label: "Save", title: undefined };
  return { label: "Save draft", title: undefined };
}
