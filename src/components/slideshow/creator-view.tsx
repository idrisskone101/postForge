"use client";

import { useMemo, useState } from "react";

import { PinterestImportDialog } from "@/components/pinterest-import-dialog";
import type { PinterestImportResult } from "@/lib/collections-client";
import { requestSlideshowCreatorDerive } from "@/lib/slideshow/client";

import { CreatorCopyForm } from "./creator-copy-form";
import { CreatorImagePicker } from "./creator-image-picker";
import { CreatorTemplatePanel } from "./creator-template-panel";
import { SAMPLE_CREATOR_TEMPLATE } from "./creator-template-sample";
import { alignCreatorDirectImages } from "./model";
import { MAX_CREATOR_SLIDES } from "./studio-ui";
import type { CreatorImagePickerTarget } from "./types";
import type { CreatorDraft, StudioHomeView } from "./view-models";

export function CreatorView({ home }: { home: StudioHomeView }) {
  const {
    imageModels,
    selectedImageModel,
    onSelectImageModel,
    creatorGenerating: generating,
    onGenerateCreator,
  } = home;
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [hookImageAssetId, setHookImageAssetId] = useState<string | null>(null);
  const [slideLines, setSlideLines] = useState<string[]>(["", "", "", ""]);
  const [slideImageAssetIds, setSlideImageAssetIds] = useState<Array<string | null>>([
    null,
    null,
    null,
    null,
  ]);
  const [imagePickerTarget, setImagePickerTarget] =
    useState<CreatorImagePickerTarget | null>(null);
  const [pickerAssetIds, setPickerAssetIds] = useState<string[]>([]);
  const [templateText, setTemplateText] = useState(SAMPLE_CREATOR_TEMPLATE);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [referenceAssetIds, setReferenceAssetIds] = useState<string[]>([]);
  const [referenceRefreshKey, setReferenceRefreshKey] = useState(0);
  const [preferredReferenceAssetIds, setPreferredReferenceAssetIds] = useState<
    string[]
  >([]);
  const [pinterestOpen, setPinterestOpen] = useState(false);
  const [deriving, setDeriving] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "4:5" | "1:1" | "16:9">(
    "9:16",
  );
  const [error, setError] = useState<string | null>(null);

  const updateLine = (index: number, value: string) => {
    setSlideLines((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const addSlideLine = () => {
    setSlideLines((current) =>
      current.length >= MAX_CREATOR_SLIDES ? current : [...current, ""],
    );
    setSlideImageAssetIds((current) =>
      current.length >= MAX_CREATOR_SLIDES ? current : [...current, null],
    );
  };

  const removeSlideLine = (index: number) => {
    setSlideLines((current) =>
      current.length <= 1
        ? current
        : current.filter((_, slideIndex) => slideIndex !== index),
    );
    setSlideImageAssetIds((current) =>
      current.length <= 1
        ? current
        : current.filter((_, slideIndex) => slideIndex !== index),
    );
  };

  const assignDirectAssetsInOrder = (assetIds: string[]) => {
    setHookImageAssetId(assetIds[0] ?? null);
    setSlideImageAssetIds((current) =>
      current.map((_, index) => assetIds[index + 1] ?? null),
    );
  };

  const openImagePicker = (target: CreatorImagePickerTarget) => {
    const currentId =
      target.kind === "hook"
        ? hookImageAssetId
        : slideImageAssetIds[target.index] ?? null;
    setPickerAssetIds(currentId ? [currentId] : []);
    setImagePickerTarget(target);
  };

  const closeImagePicker = () => {
    setImagePickerTarget(null);
    setPickerAssetIds([]);
  };

  const applyPickedSlideImage = () => {
    const assetId = pickerAssetIds[0] ?? null;
    if (!imagePickerTarget) {
      closeImagePicker();
      return;
    }
    switch (imagePickerTarget.kind) {
      case "hook":
        setHookImageAssetId(assetId);
        break;
      case "slide": {
        const index = imagePickerTarget.index;
        setSlideImageAssetIds((current) =>
          current.map((id, slideIndex) => (slideIndex === index ? assetId : id)),
        );
        break;
      }
      default: {
        const _exhaustive: never = imagePickerTarget;
        return _exhaustive;
      }
    }
    closeImagePicker();
  };

  const pickerLabel =
    imagePickerTarget?.kind === "hook"
      ? "hook"
      : imagePickerTarget
        ? `slide ${imagePickerTarget.index + 1}`
        : "slide";

  const parsedTemplate = useMemo(() => {
    try {
      const value = templateText.trim() ? JSON.parse(templateText) : null;
      setTemplateError(null);
      return value;
    } catch {
      setTemplateError("The template is not valid JSON.");
      return null;
    }
  }, [templateText]);

  const requestTemplateFromReferences = async (
    assetIds: string[],
    idempotencyKey?: string,
  ) => {
    const result = await requestSlideshowCreatorDerive("/api/slideshows", {
      collectionAssetIds: assetIds,
      idempotencyKey,
    });
    if (!result.template) {
      throw new Error(
        result.error || "Could not derive a template from those reference images.",
      );
    }
    setTemplateText(JSON.stringify(result.template, null, 2));
  };

  const deriveFromReferences = async () => {
    if (!referenceAssetIds.length || deriving) return;
    setDeriving(true);
    setError(null);
    setTemplateError(null);
    try {
      await requestTemplateFromReferences(referenceAssetIds);
    } catch (deriveError) {
      setTemplateError(
        deriveError instanceof Error
          ? deriveError.message
          : "Could not derive a template from those reference images.",
      );
    } finally {
      setDeriving(false);
    }
  };

  const createPinterestVibe = async (
    result: PinterestImportResult,
    idempotencyKey: string,
  ) => {
    if (!result.assetIds.length) {
      throw new Error("Pinterest imported no usable reference images.");
    }
    setReferenceAssetIds(result.assetIds);
    setPreferredReferenceAssetIds(result.assetIds);
    setReferenceRefreshKey((current) => current + 1);
    setTemplateError(null);
    try {
      await requestTemplateFromReferences(result.assetIds, idempotencyKey);
    } catch (deriveError) {
      const message =
        deriveError instanceof Error
          ? deriveError.message
          : "Could not create aesthetic JSON from those Pinterest images.";
      setTemplateError(message);
      throw new Error(message);
    }
  };

  const copyTemplateJson = async () => {
    try {
      await navigator.clipboard.writeText(templateText);
      setCopiedJson(true);
      window.setTimeout(() => setCopiedJson(false), 1600);
    } catch {
      setTemplateError(
        "Your browser blocked clipboard access. Select the JSON and copy it manually.",
      );
    }
  };

  const submit = async () => {
    if (generating) return;
    setError(null);
    setTemplateError(null);
    if (!hook.trim()) {
      setError("Add a hook to start the slideshow.");
      return;
    }
    const slides = slideLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (!slides.length) {
      setError("Add at least one slide of copy.");
      return;
    }
    const directImageAssetIds = alignCreatorDirectImages({
      hookAssetId: hookImageAssetId,
      slideLines,
      slideAssetIds: slideImageAssetIds,
    });
    const needsVisuals = directImageAssetIds.some((assetId) => !assetId);
    if (needsVisuals && !parsedTemplate) {
      setTemplateError(
        "Add a valid visual template before generating remaining slides.",
      );
      return;
    }
    try {
      await onGenerateCreator({
        title: title.trim() || hook.trim(),
        hook: hook.trim(),
        slides,
        template: parsedTemplate ?? {},
        collectionAssetIds: referenceAssetIds,
        directImageAssetIds,
        model: selectedImageModel ?? "gpt-image-2",
        aspectRatio,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not generate the slideshow visuals.",
      );
    }
  };

  const needsGeneration = alignCreatorDirectImages({
    hookAssetId: hookImageAssetId,
    slideLines,
    slideAssetIds: slideImageAssetIds,
  }).some((assetId) => !assetId);

  const draft: CreatorDraft = {
    title,
    onTitleChange: setTitle,
    hook,
    onHookChange: setHook,
    hookImageAssetId,
    onClearHookImage: () => setHookImageAssetId(null),
    slideLines,
    slideImageAssetIds,
    onUpdateLine: updateLine,
    onAddSlideLine: addSlideLine,
    onRemoveSlideLine: removeSlideLine,
    onClearSlideImage: (index) =>
      setSlideImageAssetIds((current) =>
        current.map((id, slideIndex) => (slideIndex === index ? null : id)),
      ),
    onOpenImagePicker: openImagePicker,
    aspectRatio,
    onAspectRatioChange: setAspectRatio,
    imageModels,
    selectedImageModel,
    onSelectImageModel,
    needsGeneration,
    generating,
    error,
    onSubmit: () => void submit(),
    onOpenPinterest: () => setPinterestOpen(true),
    referenceAssetIds,
    onReferenceAssetIdsChange: setReferenceAssetIds,
    referenceRefreshKey,
    preferredReferenceAssetIds,
    deriving,
    onDeriveFromReferences: () => void deriveFromReferences(),
    templateText,
    onTemplateTextChange: setTemplateText,
    copiedJson,
    onCopyTemplateJson: () => void copyTemplateJson(),
    templateError,
    target: imagePickerTarget,
    pickerLabel,
    pickerAssetIds,
    onPickerAssetIdsChange: setPickerAssetIds,
    onClosePicker: closeImagePicker,
    onApplyPicker: applyPickedSlideImage,
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.32fr)_minmax(300px,0.68fr)]">
        <CreatorCopyForm draft={draft} />
        <div className="grid gap-4">
          <CreatorTemplatePanel draft={draft} />
        </div>
      </div>
      <PinterestImportDialog
        open={pinterestOpen}
        onOpenChange={setPinterestOpen}
        workflow="slideshow"
        onUseDirect={(result) => {
          assignDirectAssetsInOrder(result.assetIds);
          setPreferredReferenceAssetIds(result.assetIds);
          setReferenceRefreshKey((current) => current + 1);
        }}
        onCreateVibe={createPinterestVibe}
      />
      <CreatorImagePicker draft={draft} />
    </>
  );
}
