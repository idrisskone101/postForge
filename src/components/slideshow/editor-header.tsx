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
  const setTitle = (title: string) =>
    updateProject((current) => ({ ...current, title }));
  return (
    <>
      <header className="wb-page-header pr-1" data-back="true">
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
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled slideshow"
            size={1}
            className="wb-page-title h-10 w-full min-w-0 flex-1 rounded-lg bg-transparent px-1 outline-none transition-shadow duration-160 ease-pf placeholder:text-fg-muted focus-visible:shadow-[0_0_0_2px_var(--pf-ember)] max-md:hidden"
          />
          <span className="relative grid min-h-10 min-w-0 flex-1 items-center md:hidden">
            <textarea
              aria-label="Slideshow title"
              value={draft.title}
              rows={1}
              onChange={(event) => setTitle(event.target.value.replace(/\n/g, " "))}
              placeholder="Untitled slideshow"
              className={`peer absolute inset-0 resize-none opacity-0 focus:static focus:opacity-100 focus:shadow-[0_0_0_2px_var(--pf-ember)] ${MOBILE_TITLE}`}
            />
            <span aria-hidden="true" className={`line-clamp-2 peer-focus:hidden ${MOBILE_TITLE}`}>
              {draft.title || <span className="text-fg-muted">Untitled slideshow</span>}
            </span>
          </span>
        </div>
        <div className="wb-page-actions max-sm:w-full">
          <span className="flex flex-1 sm:flex-none">
            <AutosaveStatus state={saveState} />
          </span>
          {viewMode !== "play" ? (
            <Button size={40} className="px-[18px]" onClick={() => setPickerOpen(true)}>
              Images
            </Button>
          ) : null}
          <Button variant="primary" size={40} onClick={() => void onPublish()} className="[&>svg]:size-4">
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

const MOBILE_TITLE =
  "field-sizing-content w-full rounded-lg bg-transparent px-1 text-[28px] font-bold leading-8 tracking-[-0.02em] text-fg outline-none [overflow-wrap:anywhere]";
