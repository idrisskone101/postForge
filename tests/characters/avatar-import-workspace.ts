import type { AvatarImportWorkspace } from "../../src/components/avatar-picker-import";

export function importWorkspace(
  overrides: Partial<AvatarImportWorkspace> &
    Pick<AvatarImportWorkspace, "rawJson" | "seedReferenceImages">
): AvatarImportWorkspace {
  return {
    isGeneratingCandidates: false,
    generationError: null,
    onRawJsonChange() {},
    onJsonFileChange() {},
    onSeedReferenceImagesChange() {},
    onRemoveSeedReferenceImage() {},
    onGenerateCandidates() {},
    ...overrides,
  };
}
