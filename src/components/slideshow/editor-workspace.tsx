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
    <>
      <EditorHeader />

      {viewMode === "board" ? <SlideshowBoardView /> : null}

      {viewMode === "play" ? <SlideshowPlayView /> : null}

      {viewMode === "edit" ? (
        <div
          data-slideshow-view="edit"
          className="flex min-h-0 flex-col gap-3 xl:h-[calc(100dvh-100px)] xl:min-h-[728px] xl:flex-row"
        >
          <EditorSlideRail />
          <EditorPreview />
          <EditorInspector />
        </div>
      ) : null}

      <EditorCollectionPicker />
    </>
  );
}
