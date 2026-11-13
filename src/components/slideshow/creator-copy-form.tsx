"use client";

import { Button, Icon, IconButton } from "@/components/workbench";

import { CreatorSlideImageSlot } from "./creator-image-slot";
import { MAX_CREATOR_SLIDES } from "./studio-ui";
import type { CreatorDraft } from "./view-models";

export function CreatorCopyForm({ draft }: { draft: CreatorDraft }) {
  const {
    title,
    onTitleChange,
    hook,
    onHookChange,
    hookImageAssetId,
    onClearHookImage,
    slideLines,
    slideImageAssetIds,
    onUpdateLine,
    onAddSlideLine,
    onRemoveSlideLine,
    onClearSlideImage,
    onOpenImagePicker,
  } = draft;
  return (
    <>
      <div className="wb-field">
        <label className="wb-label" htmlFor="creator-title">
          Title
        </label>
        <input
          id="creator-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Untitled slideshow"
          className="wb-input"
        />
      </div>

      <div className="wb-field">
        <label className="wb-label" htmlFor="creator-hook">
          Hook
        </label>
        <div className="flex items-start gap-2.5">
          <CreatorSlideImageSlot
            assetId={hookImageAssetId}
            label="hook"
            onPick={() => onOpenImagePicker({ kind: "hook" })}
            onClear={onClearHookImage}
          />
          <textarea
            id="creator-hook"
            value={hook}
            onChange={(event) => onHookChange(event.target.value)}
            rows={2}
            placeholder="The opening line that earns the next swipe"
            className="wb-input min-h-16 resize-none py-2.5"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2" role="group" aria-labelledby="creator-slides-label">
        <div className="flex h-4 items-center justify-between">
          <span id="creator-slides-label" className="wb-label">
            Slides
          </span>
          <span className="wb-mono text-fg-muted">
            {slideLines.length} / {MAX_CREATOR_SLIDES}
          </span>
        </div>
        {slideLines.map((line, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <span className="w-4 shrink-0 text-right text-[13px] leading-4 font-semibold text-fg-muted tabular-nums">
                {index + 1}
              </span>
              <CreatorSlideImageSlot
                assetId={slideImageAssetIds[index] ?? null}
                label={`slide ${index + 1}`}
                onPick={() => onOpenImagePicker({ kind: "slide", index })}
                onClear={() => onClearSlideImage(index)}
              />
              <textarea
                value={line}
                onChange={(event) => onUpdateLine(index, event.target.value)}
                rows={1}
                aria-label={`Text for slide ${index + 1}`}
                placeholder={`Text for slide ${index + 1}`}
                className="wb-input min-h-[42px] flex-1 py-2.5"
              />
              {slideLines.length > 1 ? (
                <IconButton
                  icon="x"
                  label={`Remove slide ${index + 1}`}
                  variant="ghost"
                  size={30}
                  onClick={() => onRemoveSlideLine(index)}
                />
              ) : (
                <span className="size-[30px] shrink-0" aria-hidden="true" />
              )}
            </div>
            {slideImageAssetIds[index] && !line.trim() ? (
              <p className="pl-[78px] text-[13px] leading-4 text-warn">
                Add copy to keep this image.
              </p>
            ) : null}
          </div>
        ))}
        <div>
          <Button
            size={32}
            onClick={onAddSlideLine}
            disabled={slideLines.length >= MAX_CREATOR_SLIDES}
          >
            <Icon name="plus" strokeWidth={2} />
            Add slide
          </Button>
        </div>
      </div>
    </>
  );
}
