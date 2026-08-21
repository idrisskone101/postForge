"use client";

import { ChevronLeft, Download, Images } from "lucide-react";

import { AutosaveStatus, type EditorSaveState } from "./editor-controls";
import { SlideshowViewSwitcher } from "./slideshow-view-modes";
import type { SlideshowViewMode } from "./slideshow-view";
import { SECONDARY_BTN } from "./studio-ui";
import type { SlideshowProject } from "./types";

export function EditorHeader({
  draft,
  saveState,
  saveError,
  viewMode,
  updateProject,
  changeViewMode,
  onOpenPicker,
  onBack,
  onPublish,
}: {
  draft: SlideshowProject;
  saveState: EditorSaveState;
  saveError: string | null;
  viewMode: SlideshowViewMode;
  updateProject: (update: (current: SlideshowProject) => SlideshowProject) => void;
  changeViewMode: (mode: SlideshowViewMode) => void;
  onOpenPicker: () => void;
  onBack: () => void;
  onPublish: () => void;
}) {
  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => void onBack()}
          disabled={saveState === "saving"}
          className={SECONDARY_BTN}
        >
          <ChevronLeft className="size-3.5" />
          Drafts
        </button>
        <span className="hidden h-5 w-px bg-border sm:block" />
        <input
          aria-label="Slideshow title"
          value={draft.title}
          onChange={(event) =>
            updateProject((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
          className="h-8 min-w-0 flex-1 bg-transparent px-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground outline-none placeholder:text-muted-foreground sm:max-w-sm"
          placeholder="Untitled slideshow"
        />
        <AutosaveStatus state={saveState} />
        <SlideshowViewSwitcher value={viewMode} onChange={changeViewMode} />
        <div className="ml-auto flex items-center gap-2">
          {viewMode !== "play" ? (
            <button type="button" className={SECONDARY_BTN} onClick={onOpenPicker}>
              <Images className="size-3.5" />
              <span className="hidden sm:inline">Images</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void onPublish()}
            className="pf-button-primary"
          >
            <Download className="size-3.5" />
            Publish / Export
          </button>
        </div>
      </header>

      {saveError ? (
        <div
          role="alert"
          className="border-b border-destructive/20 bg-destructive/10 px-5 py-2 text-[11px] text-destructive"
        >
          {saveError.includes("imagePrompt")
            ? "AI direction is too long to save. Shorten it to 2,000 characters or fewer."
            : saveError} Changes remain only in this browser until autosave succeeds; leaving now can lose them.
        </div>
      ) : null}
    </>
  );
}
