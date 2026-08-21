import type { EditorSaveState } from "./editor-controls";
import type { SlideshowProject, SlideshowSlide } from "./types";

export function mergeSavedIdentity(
  current: SlideshowProject,
  saved: SlideshowProject,
  snapshot: SlideshowProject,
): SlideshowProject {
  const savedById = new Map(saved.slides.map((slide) => [slide.id, slide]));
  const savedByClientId = new Map<string, SlideshowSlide>();
  for (const slide of saved.slides) {
    if (slide.clientId) savedByClientId.set(slide.clientId, slide);
  }
  const snapshotIds = new Set(snapshot.slides.map((slide) => slide.id));

  return {
    ...current,
    id: saved.id,
    clientId: current.clientId ?? saved.clientId ?? snapshot.id,
    revision: saved.revision,
    createdAt: saved.createdAt ?? current.createdAt,
    updatedAt: saved.updatedAt,
    slides: current.slides.map((slide) => {
      const serverSlide =
        savedById.get(slide.id) ??
        savedByClientId.get(slide.id) ??
        (slide.clientId ? savedByClientId.get(slide.clientId) : undefined);

      if (!serverSlide || !snapshotIds.has(slide.id)) return slide;
      return {
        ...slide,
        id: serverSlide.id,
        clientId: slide.clientId ?? serverSlide.clientId ?? slide.id,
      };
    }),
  };
}

export type EditorSaveSession = {
  draftRef: { current: SlideshowProject };
  editVersionRef: { current: number };
  savedVersionRef: { current: number };
  selectedSlideIdRef: { current: string };
  inFlightSaveRef: { current: Promise<void> | null };
  pendingSaveRef: { current: boolean };
  setDraft: (project: SlideshowProject) => void;
  setSaveState: (state: EditorSaveState) => void;
  setSaveError: (error: string | null) => void;
  setSelection: (id: string) => void;
  onProjectChange: (project: SlideshowProject) => void;
  onSaveProject: (
    project: SlideshowProject,
  ) => Promise<SlideshowProject | void>;
};

export async function flushEditorSave(
  session: EditorSaveSession,
): Promise<SlideshowProject> {
  const {
    draftRef,
    editVersionRef,
    savedVersionRef,
    selectedSlideIdRef,
    inFlightSaveRef,
    pendingSaveRef,
    setDraft,
    setSaveState,
    setSaveError,
    setSelection,
    onProjectChange,
    onSaveProject,
  } = session;

  if (inFlightSaveRef.current) {
    pendingSaveRef.current = true;
    await inFlightSaveRef.current;
    if (savedVersionRef.current < editVersionRef.current) {
      return flushEditorSave(session);
    }
    return draftRef.current;
  }

  const task = (async () => {
    do {
      pendingSaveRef.current = false;
      const snapshot = draftRef.current;
      const versionAtStart = editVersionRef.current;
      setSaveState("saving");
      setSaveError(null);

      try {
        const saved = await onSaveProject(snapshot);
        const hasNewerEdits = editVersionRef.current !== versionAtStart;
        const next = saved
          ? hasNewerEdits
            ? mergeSavedIdentity(draftRef.current, saved, snapshot)
            : saved
          : draftRef.current;
        if (saved) {
          const selectedAfter = resolveSavedSelection({
            next,
            saved,
            snapshot,
            selectedBefore: selectedSlideIdRef.current,
            hasNewerEdits,
          });
          if (selectedAfter) setSelection(selectedAfter);
        }
        draftRef.current = next;
        setDraft(next);
        savedVersionRef.current = versionAtStart;
        onProjectChange(next);

        if (!hasNewerEdits) setSaveState("saved");
        if (hasNewerEdits) pendingSaveRef.current = true;
      } catch (error) {
        setSaveState("error");
        setSaveError(
          error instanceof Error ? error.message : "Could not save this draft.",
        );
        throw error;
      }
    } while (pendingSaveRef.current);
  })();

  inFlightSaveRef.current = task;
  try {
    await task;
  } finally {
    inFlightSaveRef.current = null;
  }
  return draftRef.current;
}

export function resolveSavedSelection(input: {
  next: SlideshowProject;
  saved: SlideshowProject;
  snapshot: SlideshowProject;
  selectedBefore: string;
  hasNewerEdits: boolean;
}): string | undefined {
  const { next, saved, snapshot, selectedBefore, hasNewerEdits } = input;
  return (
    next.slides.find((slide) => slide.id === selectedBefore)?.id ??
    next.slides.find((slide) => slide.clientId === selectedBefore)?.id ??
    (!hasNewerEdits
      ? saved.slides[
          Math.max(
            0,
            snapshot.slides.findIndex((slide) => slide.id === selectedBefore),
          )
        ]?.id
      : undefined)
  );
}
