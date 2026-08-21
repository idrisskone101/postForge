"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { platformCollectionAssetUrl } from "@/lib/collections-client";

import { type EditorSaveState } from "./editor-controls";
import {
  runSlideCopyRegeneration,
  runSlideImageRegeneration,
} from "./editor-generate";
import { gridRequiredCount } from "./editor-image";
import { handleEditorKeyDown } from "./editor-keyboard";
import { flushEditorSave } from "./editor-save";
import {
  projectForPhaseSelection,
  projectWithAddedSlide,
  projectWithDeletedSlide,
  projectWithDuplicatedSlide,
  projectWithMovedSlide,
} from "./editor-slides";
import { EditorWorkspace } from "./editor-workspace";
import { SlideshowEditorProvider } from "./slideshow-editor-provider";
import { updateSlideshowSlide } from "./model";
import {
  parseSlideshowViewMode,
  slideLayerCount,
  stepSlideIndex,
  type SlideshowViewMode,
} from "./slideshow-view";
import type {
  SlideshowEditorProps,
  SlideshowProject,
  SlideshowSlide,
  SlideshowSlideKind,
  SlideshowTextSettings,
} from "./types";
import { isLocalSlideshowId } from "./types";

export function SlideshowEditor(props: SlideshowEditorProps) {
  const {
    project,
    onBack,
    onProjectChange,
    onSaveProject,
    onRegenerateSlide,
    onRegenerateImage,
    collections,
    onPublish,
    imageModels = [],
    selectedImageModel = null,
    onSelectImageModel,
    initialViewMode = "edit",
  } = props;
  const [draft, setDraft] = useState(project);
  const [viewMode, setViewMode] = useState<SlideshowViewMode>(() =>
    parseSlideshowViewMode(initialViewMode),
  );
  const [selectedSlideId, setSelectedSlideId] = useState(
    project.slides[0]?.id ?? "",
  );
  const [advanced, setAdvanced] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAssetIds, setPickerAssetIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<EditorSaveState>(
    isLocalSlideshowId(project.id) ? "unsaved" : "saved",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [autosaveTick, setAutosaveTick] = useState(
    isLocalSlideshowId(project.id) ? 1 : 0,
  );

  const draftRef = useRef(draft);
  const selectedSlideIdRef = useRef(selectedSlideId);
  const viewModeRef = useRef(viewMode);
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);
  const editVersionRef = useRef(isLocalSlideshowId(project.id) ? 1 : 0);
  const savedVersionRef = useRef(0);
  const inFlightSaveRef = useRef<Promise<void> | null>(null);
  const pendingSaveRef = useRef(false);

  const setSelection = useCallback((id: string) => {
    selectedSlideIdRef.current = id;
    setSelectedSlideId(id);
  }, []);

  const activeIndex = Math.max(
    0,
    draft.slides.findIndex((slide) => slide.id === selectedSlideId),
  );
  const activeSlide = draft.slides[activeIndex] ?? draft.slides[0];
  const activePhase = activeSlide?.kind ?? "hook";
  const phaseSettings = draft.phaseSettings[activePhase];
  const layerCount = activeSlide ? slideLayerCount(activeSlide) : 0;

  const applyProject = useCallback(
    (next: SlideshowProject) => {
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      draftRef.current = stamped;
      setDraft(stamped);
      editVersionRef.current += 1;
      setAutosaveTick(editVersionRef.current);
      setSaveState("unsaved");
      setSaveError(null);
      onProjectChange(stamped);
    },
    [onProjectChange],
  );

  const updateProject = useCallback(
    (update: (current: SlideshowProject) => SlideshowProject) => {
      const current = draftRef.current;
      const next = update(current);
      if (next !== current) applyProject(next);
    },
    [applyProject],
  );

  const flushSave = useCallback(async () => {
    return flushEditorSave({
      draftRef,
      editVersionRef,
      savedVersionRef,
      selectedSlideIdRef,
      inFlightSaveRef,
      pendingSaveRef,
      setDraft,
      setSaveState,
      setSaveError,
      setSelection,
      onProjectChange,
      onSaveProject,
    });
  }, [onProjectChange, onSaveProject, setSelection]);

  useEffect(() => {
    if (autosaveTick <= savedVersionRef.current) return;
    const timeout = window.setTimeout(() => {
      void flushSave().catch(() => undefined);
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [autosaveTick, flushSave]);

  const selectSlide = useCallback((slide: SlideshowSlide) => {
    setSelection(slide.id);
  }, [setSelection]);

  const changeViewMode = useCallback((mode: SlideshowViewMode) => {
    viewModeRef.current = mode;
    setViewMode(mode);
  }, []);

  const stepSelectedSlide = useCallback(
    (delta: -1 | 1, wrap: boolean) => {
      const current = draftRef.current;
      const selectedId = selectedSlideIdRef.current;
      const index = Math.max(
        0,
        current.slides.findIndex((slide) => slide.id === selectedId),
      );
      const nextIndex = stepSlideIndex(index, delta, current.slides.length, wrap);
      const next = current.slides[nextIndex];
      if (next) setSelection(next.id);
    },
    [setSelection],
  );

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      handleEditorKeyDown(event, {
        viewMode: viewModeRef.current,
        onExitPlay: () => changeViewMode("edit"),
        onStep: stepSelectedSlide,
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeViewMode, stepSelectedSlide]);

  useEffect(() => {
    if (viewMode !== "edit") return;
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedSlideId, viewMode]);

  const selectPhase = (phase: SlideshowSlideKind) => {
    const result = projectForPhaseSelection(draft, phase);
    if (!result) return;
    if (result.project) applyProject(result.project);
    setSelection(result.selectedId);
  };

  const addSlide = () => {
    const result = projectWithAddedSlide(draft, activeIndex);
    if (!result) return;
    applyProject(result.project);
    setSelection(result.selectedId);
  };

  const duplicateSlide = () => {
    const result = projectWithDuplicatedSlide(draft, activeIndex);
    if (!result) return;
    applyProject(result.project);
    setSelection(result.selectedId);
  };

  const deleteSlide = () => {
    const result = projectWithDeletedSlide(draft, activeIndex);
    if (!result) return;
    applyProject(result.project);
    setSelection(result.selectedId);
  };

  const moveSlide = (direction: -1 | 1) => {
    const next = projectWithMovedSlide(draft, activeIndex, direction);
    if (next) applyProject(next);
  };

  const updateActiveSlide = (patch: Partial<SlideshowSlide>) => {
    if (!activeSlide) return;
    updateProject((current) =>
      updateSlideshowSlide(current, activeSlide.id, patch),
    );
  };

  const updateTextSettings = (patch: Partial<SlideshowTextSettings>) => {
    updateProject((current) => ({
      ...current,
      textSettings: { ...current.textSettings, ...patch },
    }));
  };

  const updatePhaseSettings = (
    patch: Partial<(typeof draft.phaseSettings)[SlideshowSlideKind]>,
  ) => {
    updateProject((current) => ({
      ...current,
      phaseSettings: {
        ...current.phaseSettings,
        [activePhase]: { ...current.phaseSettings[activePhase], ...patch },
      },
    }));
  };

  const handleRegenerate = async () => {
    if (!activeSlide || regenerating) return;
    setRegenerating(true);
    setSaveError(null);
    try {
      await runSlideCopyRegeneration({
        activeSlide,
        activeIndex,
        getDraft: () => draftRef.current,
        onRegenerateSlide,
        applyProject,
        setSelection,
        updateActiveSlide,
        setSaveError,
      });
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!activeSlide || regeneratingImage) return;
    setRegeneratingImage(true);
    setSaveError(null);
    try {
      await runSlideImageRegeneration({
        activeIndex,
        getDraft: () => draftRef.current,
        getSelectedId: () => selectedSlideIdRef.current,
        flushSave,
        waitForInFlightSave: async () => {
          if (inFlightSaveRef.current) {
            await inFlightSaveRef.current.catch(() => undefined);
          }
        },
        onRegenerateImage,
        applyQueuedRevision: (projectRevision) => {
          const current = draftRef.current;
          const revised = { ...current, revision: projectRevision };
          draftRef.current = revised;
          setDraft(revised);
          onProjectChange(revised);
        },
        applyProject,
        setSelection,
        setSaveError,
      });
    } finally {
      setRegeneratingImage(false);
    }
  };

  const applyCollection = (collectionId: string) => {
    const collection = collections.find((item) => item.id === collectionId);
    if (!collection || !activeSlide) return;
    const required = gridRequiredCount(phaseSettings.grid);
    updateActiveSlide({
      visualKey: collection.visualKeys[0] ?? activeSlide.visualKey,
      visualKeys: collection.visualKeys.slice(0, required),
      imageUrls: collection.imageUrls?.slice(0, required),
    });
  };

  const applyPickedAssets = () => {
    if (!activeSlide || !pickerAssetIds.length) {
      setPickerOpen(false);
      return;
    }
    updateActiveSlide({
      imageUrls: pickerAssetIds
        .slice(0, gridRequiredCount(phaseSettings.grid))
        .map(platformCollectionAssetUrl),
    });
    setPickerOpen(false);
    setPickerAssetIds([]);
  };

  const previewIndices = useMemo(
    () =>
      [activeIndex - 1, activeIndex, activeIndex + 1].filter(
        (index) => index >= 0 && index < draft.slides.length,
      ),
    [activeIndex, draft.slides.length],
  );

  if (!activeSlide) return null;

  return (
    <SlideshowEditorProvider
      workspace={{
        draft,
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
        applyPickedAssets,
        addSlide,
        duplicateSlide,
        deleteSlide,
        moveSlide,
        setPickerOpen,
        setPickerAssetIds,
        setAdvanced,
        onSelectImageModel,
        onBack: () => {
          void flushSave().then(onBack).catch(() => undefined);
        },
        onPublish: () => {
          void flushSave().then(onPublish).catch(() => undefined);
        },
        onRegenerateText: () => void handleRegenerate(),
        onRegenerateImage: () => void handleRegenerateImage(),
      }}
    >
      <EditorWorkspace />
    </SlideshowEditorProvider>
  );
}
