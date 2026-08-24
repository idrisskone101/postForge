import type { SlideshowProject, SlideshowProjectListItem } from "./types";

export function applyStudioExportReceipt(
  current: SlideshowProjectListItem[],
  projectId: string,
  receipt: { successfulExportCount: number; exportedAt: string },
): SlideshowProjectListItem[] {
  return current.map((candidate) =>
    candidate.id === projectId
      ? {
          ...candidate,
          successfulExportCount: receipt.successfulExportCount,
          lastExportedAt: receipt.exportedAt,
        }
      : candidate,
  );
}

export function applyStudioExportReceiptToProject(
  current: SlideshowProject | null,
  projectId: string,
  receipt: { successfulExportCount: number; exportedAt: string },
): SlideshowProject | null {
  if (!current || current.id !== projectId) return current;
  return {
    ...current,
    successfulExportCount: receipt.successfulExportCount,
    lastExportedAt: receipt.exportedAt,
    exportHistory: [...(current.exportHistory ?? []), receipt.exportedAt].slice(
      -500,
    ),
  };
}
