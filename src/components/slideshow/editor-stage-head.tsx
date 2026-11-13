"use client";

import { Segmented } from "@/components/workbench";

import type { SlideshowViewMode } from "./slideshow-view";
import type { SlideshowAspectRatio } from "./types";

export function EditorStageHead({
  viewMode,
  aspectRatio,
  onViewChange,
  onAspectChange,
}: {
  viewMode: SlideshowViewMode;
  aspectRatio?: SlideshowAspectRatio;
  onViewChange: (mode: SlideshowViewMode) => void;
  onAspectChange?: (aspectRatio: SlideshowAspectRatio) => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <SlideshowViewSwitcher value={viewMode} onChange={onViewChange} />
      {aspectRatio && onAspectChange ? (
        <Segmented
          label="Aspect ratio"
          value={aspectRatio}
          options={ASPECT_OPTIONS}
          onChange={onAspectChange}
        />
      ) : null}
    </div>
  );
}

export function SlideshowViewSwitcher({
  value,
  onChange,
}: {
  value: SlideshowViewMode;
  onChange: (mode: SlideshowViewMode) => void;
}) {
  return (
    <div role="tablist" aria-label="Slideshow view" className="wb-segmented">
      {VIEW_OPTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          data-slideshow-view-tab={id}
          onClick={() => onChange(id)}
          className="wb-segment"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const VIEW_OPTIONS: { id: SlideshowViewMode; label: string }[] = [
  { id: "edit", label: "Edit" },
  { id: "board", label: "All slides" },
  { id: "play", label: "Play" },
];

const ASPECT_OPTIONS: { value: SlideshowAspectRatio; label: string }[] = [
  { value: "4:5", label: "4:5" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
];
