"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Button, Segmented, Toggle, iconButtonClass } from "@/components/workbench";

import { EditorDisclosure, EditorSelect, type EditorOption } from "./editor-controls";
import { EditorSlider } from "./editor-type-controls";
import { MAX_SLIDESHOW_SLIDES, setSlideshowCta } from "./model";
import { phaseLabel } from "./slideshow-view";
import { useSlideshowEditor } from "./slideshow-editor-provider";
import type { SlideshowGrid, SlideshowSlideKind } from "./types";

export function EditorSlideSettings() {
  const editor = useSlideshowEditor();
  const { draft, activePhase, activeIndex, layerCount, phaseSettings } = editor;
  const [open, setOpen] = useState(false);
  const total = draft.slides.length;
  const hasCta = draft.slides.some((slide) => slide.kind === "cta");
  return (
    <EditorDisclosure
      title="Slide"
      meta={`${phaseLabel(activePhase)}, ${layerCount} ${layerCount === 1 ? "layer" : "layers"}`}
      open={open}
      onToggle={() => setOpen((current) => !current)}
    >
      <Segmented<SlideshowSlideKind>
        label="Slide phase"
        value={activePhase}
        options={[
          { value: "hook", label: "Hook" },
          { value: "content", label: "Content" },
          { value: "cta", label: hasCta ? "CTA" : "Add CTA" },
        ]}
        onChange={editor.selectPhase}
        className="wb-segmented-block"
      />
      <EditorSelect<SlideshowGrid>
        label="Image grid"
        value={phaseSettings.grid}
        options={GRID_OPTIONS}
        onChange={(grid) => editor.updatePhaseSettings({ grid })}
      />
      {editor.collections.length ? (
        <label className="wb-field">
          <span className="wb-label">Apply collection</span>
          <select
            defaultValue=""
            onChange={(event) => {
              editor.applyCollection(event.target.value);
              event.target.value = "";
            }}
            className="wb-input"
          >
            <option value="" disabled>
              Choose a collection
            </option>
            {editor.collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}, {collection.imageCount} images
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <ToggleRow
        label="Dark overlay"
        checked={phaseSettings.overlayEnabled}
        onChange={(overlayEnabled) => editor.updatePhaseSettings({ overlayEnabled })}
      />
      {phaseSettings.overlayEnabled ? (
        <EditorSlider
          label="Overlay opacity"
          unit="%"
          min={0}
          max={100}
          value={phaseSettings.overlayOpacity}
          fallback={0}
          onChange={(overlayOpacity) => editor.updatePhaseSettings({ overlayOpacity })}
        />
      ) : null}
      <ToggleRow
        label="Display text"
        checked={phaseSettings.displayText}
        onChange={(displayText) => editor.updatePhaseSettings({ displayText })}
      />
      <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline pt-3.5">
        <button
          type="button"
          aria-label="Move slide earlier"
          title="Move slide earlier"
          disabled={activeIndex === 0}
          onClick={() => editor.moveSlide(-1)}
          className={iconButtonClass("quiet", 30)}
        >
          <ArrowUp strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Move slide later"
          title="Move slide later"
          disabled={activeIndex === total - 1}
          onClick={() => editor.moveSlide(1)}
          className={iconButtonClass("quiet", 30)}
        >
          <ArrowDown strokeWidth={1.5} aria-hidden="true" />
        </button>
        <Button size={32} onClick={editor.duplicateSlide} disabled={total >= MAX_SLIDESHOW_SLIDES}>
          Duplicate
        </Button>
        <Button variant="danger" size={32} onClick={editor.deleteSlide} disabled={total <= 1}>
          Delete slide
        </Button>
        <span className="wb-meta ml-auto">
          {total} / {MAX_SLIDESHOW_SLIDES} slides
        </span>
      </div>
    </EditorDisclosure>
  );
}

export function EditorAdvancedSettings() {
  const editor = useSlideshowEditor();
  const { draft, advanced, imageModels, selectedImageModel } = editor;
  return (
    <EditorDisclosure
      title="Advanced"
      open={advanced}
      onToggle={() => editor.setAdvanced((current) => !current)}
    >
      {imageModels.length > 0 ? (
        <EditorSelect<string>
          label="Image model"
          value={selectedImageModel ?? ""}
          options={imageModels.map((model) => ({ value: model.id, label: model.name }))}
          onChange={(modelId) => editor.onSelectImageModel?.(modelId)}
        />
      ) : (
        <div className="wb-field">
          <span className="wb-label">Image model</span>
          <span className="wb-meta">Using the workspace default image model.</span>
        </div>
      )}
      <label className="wb-field">
        <span className="wb-label">Language</span>
        <input
          value={draft.language}
          onChange={(event) =>
            editor.updateProject((current) => ({ ...current, language: event.target.value }))
          }
          className="wb-input"
        />
      </label>
      <ToggleRow
        label="Include CTA slide"
        checked={draft.includeCta}
        onChange={(checked) => editor.updateProject((current) => setSlideshowCta(current, checked))}
      />
      <ToggleRow
        label="Prevent repeated hooks"
        checked={draft.preventRepeats}
        onChange={(preventRepeats) =>
          editor.updateProject((current) => ({ ...current, preventRepeats }))
        }
      />
    </EditorDisclosure>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <span className="text-[14px] font-medium text-fg">{label}</span>
      <Toggle checked={checked} onCheckedChange={onChange} label={label} size={26} />
    </div>
  );
}

const GRID_OPTIONS: EditorOption<SlideshowGrid>[] = [
  { value: "none", label: "None" },
  { value: "1:2", label: "1:2" },
  { value: "1:3", label: "1:3" },
  { value: "2:1", label: "2:1" },
  { value: "2:2", label: "2:2" },
];
