"use client";

import { Button, Icon, IconButton } from "@/components/workbench";

import { AutosaveStatus } from "./editor-controls";
import { useSlideshowEditor } from "./slideshow-editor-provider";

export function EditorHeader() {
  const {
    draft,
    saveState,
    saveError,
    viewMode,
    updateProject,
    setPickerOpen,
    onBack,
    onPublish,
  } = useSlideshowEditor();
  return (
    <>
      <header className="wb-page-header" data-back="true">
        <div className="wb-page-header-lead">
          <IconButton
            icon="chevron-left"
            label="Back to drafts"
            size={40}
            onClick={() => void onBack()}
            disabled={saveState === "saving"}
          />
          <input
            aria-label="Slideshow title"
            value={draft.title}
            onChange={(event) =>
              updateProject((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Untitled slideshow"
            className="wb-page-title h-10 w-full min-w-0 flex-1 rounded-lg bg-transparent px-1 outline-none transition-shadow duration-160 ease-pf placeholder:text-fg-muted focus-visible:shadow-[0_0_0_2px_var(--pf-ember)]"
          />
        </div>
        <div className="wb-page-actions max-sm:w-full">
          <span className="flex-1 sm:flex-none">
            <AutosaveStatus state={saveState} />
          </span>
          {viewMode !== "play" ? (
            <Button size={40} className="px-[18px]" onClick={() => setPickerOpen(true)}>
              Images
            </Button>
          ) : null}
          <Button variant="primary" size={40} onClick={() => void onPublish()}>
            <Icon name="upload" size={16} strokeWidth={2} />
            Publish / Export
          </Button>
        </div>
      </header>

      {saveError ? (
        <div role="alert" className="wb-notice wb-fade-in" data-tone="bad">
          <Icon name="alert" size={16} className="shrink-0 text-bad" />
          <span>
            {saveError.includes("imagePrompt")
              ? "AI direction is too long to save. Shorten it to 2,000 characters or fewer."
              : saveError}{" "}
            Changes remain only in this browser until autosave succeeds; leaving now can lose them.
          </span>
        </div>
      ) : null}
    </>
  );
}
