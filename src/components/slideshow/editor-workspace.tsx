"use client";

import { EditorCollectionPicker } from "./editor-collection-picker";
import { EditorHeader } from "./editor-header";
import { EditorInspector } from "./editor-inspector";
import { EditorPreview } from "./editor-preview";
import { EditorSlideRail } from "./editor-slide-rail";
import { useSlideshowEditor } from "./slideshow-editor-provider";
import {
  SlideshowBoardView,
  SlideshowPlayView,
} from "./slideshow-view-modes";

export function EditorWorkspace() {
  const { viewMode } = useSlideshowEditor();

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--pf-canvas)]">
      <EditorHeader />

      {viewMode === "board" ? <SlideshowBoardView /> : null}

      {viewMode === "play" ? <SlideshowPlayView /> : null}

      {viewMode === "edit" ? (
      <div
        data-slideshow-view="edit"
        className="grid min-h-0 flex-1 overflow-y-auto xl:grid-cols-[264px_minmax(300px,1fr)_304px]"
      >
        <EditorSlideRail />
        <EditorPreview />
        <EditorInspector />
      </div>
      ) : null}

      <EditorCollectionPicker />
    </div>
  );
}
