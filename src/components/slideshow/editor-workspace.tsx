"use client";

import { EditorCollectionPicker } from "./editor-collection-picker";
import { EditorHeader } from "./editor-header";
import { EditorInspector } from "./editor-inspector";
import { EditorPreview } from "./editor-preview";
import { EditorSlideRail } from "./editor-slide-rail";
import {
  SlideshowBoardView,
  SlideshowPlayView,
} from "./slideshow-view-modes";
import type { SlideshowEditorWorkspace } from "./view-models";

export function EditorWorkspace({
  workspace,
}: {
  workspace: SlideshowEditorWorkspace;
}) {
  const { viewMode } = workspace;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--pf-canvas)]">
      <EditorHeader workspace={workspace} />

      {viewMode === "board" ? (
        <SlideshowBoardView workspace={workspace} />
      ) : null}

      {viewMode === "play" ? (
        <SlideshowPlayView workspace={workspace} />
      ) : null}

      {viewMode === "edit" ? (
      <div
        data-slideshow-view="edit"
        className="grid min-h-0 flex-1 overflow-y-auto xl:grid-cols-[264px_minmax(300px,1fr)_304px]"
      >
        <EditorSlideRail workspace={workspace} />
        <EditorPreview workspace={workspace} />
        <EditorInspector workspace={workspace} />
      </div>
      ) : null}

      <EditorCollectionPicker workspace={workspace} />
    </div>
  );
}
