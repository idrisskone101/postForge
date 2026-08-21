"use client";

import type { RefObject } from "react";

import { type EditorSaveState } from "./editor-controls";
import { EditorCollectionPicker } from "./editor-collection-picker";
import { EditorHeader } from "./editor-header";
import { EditorInspector } from "./editor-inspector";
import { EditorPreview } from "./editor-preview";
import { EditorSlideRail } from "./editor-slide-rail";
import { setSlideshowCta } from "./model";
import {
  SlideshowBoardView,
  SlideshowPlayView,
} from "./slideshow-view-modes";
import type { SlideshowViewMode } from "./slideshow-view";
import type {
  SlideshowCollection,
  SlideshowProject,
  SlideshowSlide,
  SlideshowSlideKind,
  SlideshowTextSettings,
} from "./types";

export function EditorWorkspace({
  draft,
  draftRef,
  saveState,
  saveError,
  viewMode,
  selectedSlideId,
  activeSlide,
  activePhase,
  activeIndex,
  layerCount,
  collections,
  phaseSettings,
  advanced,
  imageModels,
  selectedImageModel,
  regenerating,
  regeneratingImage,
  previewIndices,
  activeThumbRef,
  pickerOpen,
  pickerAssetIds,
  updateProject,
  updatePhaseSettings,
  updateTextSettings,
  updateActiveSlide,
  changeViewMode,
  selectSlide,
  selectPhase,
  applyCollection,
  applyProject,
  applyPickedAssets,
  addSlide,
  duplicateSlide,
  deleteSlide,
  moveSlide,
  setPickerOpen,
  setPickerAssetIds,
  setAdvanced,
  onSelectImageModel,
  onBack,
  onPublish,
  onRegenerateText,
  onRegenerateImage,
}: {
  draft: SlideshowProject;
  draftRef: { current: SlideshowProject };
  saveState: EditorSaveState;
  saveError: string | null;
  viewMode: SlideshowViewMode;
  selectedSlideId: string;
  activeSlide: SlideshowSlide;
  activePhase: SlideshowSlideKind;
  activeIndex: number;
  layerCount: number;
  collections: SlideshowCollection[];
  phaseSettings: SlideshowProject["phaseSettings"][SlideshowSlideKind];
  advanced: boolean;
  imageModels: Array<{ id: string; name: string }>;
  selectedImageModel: string | null;
  regenerating: boolean;
  regeneratingImage: boolean;
  previewIndices: number[];
  activeThumbRef: RefObject<HTMLButtonElement | null>;
  pickerOpen: boolean;
  pickerAssetIds: string[];
  updateProject: (update: (current: SlideshowProject) => SlideshowProject) => void;
  updatePhaseSettings: (
    patch: Partial<SlideshowProject["phaseSettings"][SlideshowSlideKind]>,
  ) => void;
  updateTextSettings: (patch: Partial<SlideshowTextSettings>) => void;
  updateActiveSlide: (patch: Partial<SlideshowSlide>) => void;
  changeViewMode: (mode: SlideshowViewMode) => void;
  selectSlide: (slide: SlideshowSlide) => void;
  selectPhase: (phase: SlideshowSlideKind) => void;
  applyCollection: (collectionId: string) => void;
  applyProject: (project: SlideshowProject) => void;
  applyPickedAssets: () => void;
  addSlide: () => void;
  duplicateSlide: () => void;
  deleteSlide: () => void;
  moveSlide: (direction: -1 | 1) => void;
  setPickerOpen: (open: boolean) => void;
  setPickerAssetIds: (ids: string[] | ((current: string[]) => string[])) => void;
  setAdvanced: (value: boolean | ((current: boolean) => boolean)) => void;
  onSelectImageModel?: (modelId: string) => void;
  onBack: () => void;
  onPublish: () => void;
  onRegenerateText: () => void;
  onRegenerateImage: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--pf-canvas)]">
      <EditorHeader
        draft={draft}
        saveState={saveState}
        saveError={saveError}
        viewMode={viewMode}
        updateProject={updateProject}
        changeViewMode={changeViewMode}
        onOpenPicker={() => setPickerOpen(true)}
        onBack={onBack}
        onPublish={onPublish}
      />

      {viewMode === "board" ? (
        <SlideshowBoardView
          project={draft}
          selectedSlideId={selectedSlideId}
          onSelect={selectSlide}
          onOpenEdit={(slide) => {
            selectSlide(slide);
            changeViewMode("edit");
          }}
          onAdd={addSlide}
          onDuplicate={duplicateSlide}
          onDelete={deleteSlide}
          onMove={moveSlide}
        />
      ) : null}

      {viewMode === "play" ? (
        <SlideshowPlayView
          project={draft}
          selectedSlideId={selectedSlideId}
          onSelect={selectSlide}
        />
      ) : null}

      {viewMode === "edit" ? (
      <div
        data-slideshow-view="edit"
        className="grid min-h-0 flex-1 overflow-y-auto xl:grid-cols-[264px_minmax(300px,1fr)_304px]"
      >
        <EditorSlideRail
          draft={draft}
          activePhase={activePhase}
          collections={collections}
          phaseSettings={phaseSettings}
          advanced={advanced}
          imageModels={imageModels}
          selectedImageModel={selectedImageModel}
          selectPhase={selectPhase}
          applyCollection={applyCollection}
          updateProject={updateProject}
          updatePhaseSettings={updatePhaseSettings}
          onOpenPicker={() => setPickerOpen(true)}
          onToggleAdvanced={() => setAdvanced((current) => !current)}
          onSelectImageModel={onSelectImageModel}
          onToggleCta={(checked) => {
            applyProject(setSlideshowCta(draftRef.current, checked));
          }}
        />
        <EditorPreview
          draft={draft}
          previewIndices={previewIndices}
          activeIndex={activeIndex}
          regeneratingImage={regeneratingImage}
          activeThumbRef={activeThumbRef}
          selectSlide={selectSlide}
          addSlide={addSlide}
          moveSlide={moveSlide}
          duplicateSlide={duplicateSlide}
          deleteSlide={deleteSlide}
        />
        <EditorInspector
          draft={draft}
          activeSlide={activeSlide}
          activePhase={activePhase}
          activeIndex={activeIndex}
          layerCount={layerCount}
          regenerating={regenerating}
          regeneratingImage={regeneratingImage}
          saveState={saveState}
          updateTextSettings={updateTextSettings}
          updateActiveSlide={updateActiveSlide}
          onRegenerateText={onRegenerateText}
          onRegenerateImage={onRegenerateImage}
        />
      </div>
      ) : null}

      <EditorCollectionPicker
        open={pickerOpen}
        pickerAssetIds={pickerAssetIds}
        onOpenChange={setPickerOpen}
        onPickerAssetIdsChange={setPickerAssetIds}
        onCancel={() => {
          setPickerOpen(false);
          setPickerAssetIds([]);
        }}
        onApply={applyPickedAssets}
      />
    </div>
  );
}
