"use client";

import type { ReactNode } from "react";
import type { ModelDefinition } from "@/lib/ai/types";
import { GenerateCollectionSection } from "./form-collection-section";
import { GenerateContinuitySection } from "./form-continuity-section";
import { GenerateSwapSection } from "./form-swap-section";
import type { GenerateFormViewProps } from "./form-types";
import type { useGenerationForm } from "./use-generation-form";

type GenerationFormState = ReturnType<typeof useGenerationForm>;

export function generateFormViewProps({
  models,
  form,
  onSubmit,
  identitySection,
}: {
  models: ModelDefinition[];
  form: GenerationFormState;
  onSubmit: () => void;
  identitySection: ReactNode;
}): GenerateFormViewProps {
  const {
    selectedDefinition,
    avatarId,
    videoReferenceFileId,
    collectionAssetIds,
    prompt,
    aspectRatio,
    numImages,
    duration,
    negativePrompt,
    enableWebSearch,
    enableAudio,
    vibe,
    improvement,
    isSwapSelected,
    vibeMode,
    vibeRequirement,
    swapCanSubmit,
  } = form;

  return {
    models,
    selectedModel: form.selectedModel,
    prompt,
    aspectRatio,
    numImages,
    duration,
    negativePrompt,
    enableWebSearch,
    enableAudio,
    isSubmitting: form.isSubmitting,
    isImprovingPrompt: improvement.isImprovingPrompt,
    advancedOpen: form.advancedOpen,
    submitError: form.submitError,
    notice: form.notice,
    promptImprovementError: improvement.promptImprovementError,
    promptImprovementNotice: improvement.promptImprovementNotice,
    promptEnhancerConfigured: improvement.promptEnhancerConfigured,
    canUndoPromptImprovement: improvement.promptBeforeImprovement !== null,
    onModelSelect: form.handleModelSelect,
    onPromptChange: (nextPrompt) => {
      improvement.promptImprovementRequestGateRef.current.invalidateInputs();
      improvement.invalidateUndoOnPromptEdit();
      form.setPrompt(nextPrompt);
    },
    onAspectRatioChange: (nextAspectRatio) => {
      improvement.promptImprovementRequestGateRef.current.invalidateInputs();
      form.setAspectRatio(nextAspectRatio);
    },
    onNumImagesChange: form.setNumImages,
    onDurationChange: (nextDuration) => {
      improvement.promptImprovementRequestGateRef.current.invalidateInputs();
      form.setDuration(nextDuration);
    },
    onNegativePromptChange: form.setNegativePrompt,
    onEnableWebSearchChange: form.setEnableWebSearch,
    onEnableAudioChange: (enabled) => {
      improvement.promptImprovementRequestGateRef.current.invalidateInputs();
      form.setEnableAudio(enabled);
    },
    onAdvancedOpenChange: form.setAdvancedOpen,
    onSubmit,
    onImprovePrompt: () => {
      form.setNotice(null);
      void improvement.handleImprovePrompt({
        prompt,
        selectedDefinition,
        aspectRatio,
        duration,
        enableAudio,
        hasCharacterReference: Boolean(avatarId),
        hasVisualReference:
          collectionAssetIds.length > 0 ||
          Boolean(videoReferenceFileId) ||
          Boolean(form.swapVideo) ||
          Boolean(form.swapReference),
        onPromptChange: form.setPrompt,
      });
    },
    onUndoPromptImprovement: () =>
      improvement.handleUndoPromptImprovement(form.setPrompt),
    onAppendToPrompt: (text) => {
      improvement.promptImprovementRequestGateRef.current.invalidateInputs();
      improvement.invalidateUndoOnPromptEdit();
      form.setPrompt((current) => (current ? `${current}, ${text}` : text));
    },
    avatarSection: isSwapSelected ? undefined : identitySection,
    referenceSection: isSwapSelected ? undefined : (
      <GenerateCollectionSection
        avatarId={avatarId}
        collectionAssetIds={collectionAssetIds}
        maxSelection={form.maximumCollectionReferences}
        disabled={Boolean(videoReferenceFileId)}
        vibeMode={vibeMode}
        vibeExtracting={vibe.vibeExtracting}
        vibeExtractError={vibe.vibeExtractError}
        vibeStale={form.vibeStale}
        vibeEditorActive={vibe.vibeEditorActive}
        vibeJsonText={vibe.vibeJsonText}
        vibeJsonError={vibe.vibeJsonError}
        vibeTemplate={vibe.vibeTemplate}
        foldEnabled={vibe.foldEnabled}
        vibeFolding={vibe.vibeFolding}
        vibeFoldError={vibe.vibeFoldError}
        foldStale={form.foldStale}
        foldedPromptValue={vibe.foldedPromptValue}
        prompt={prompt}
        onClear={() => {
          improvement.promptImprovementRequestGateRef.current.invalidateInputs();
          form.setCollectionAssetIds([]);
          vibe.resetVibeState();
        }}
        onCollectionChange={form.handleCollectionAssetChange}
        onExtractVibe={() => {
          improvement.promptImprovementRequestGateRef.current.invalidateInputs();
          form.setSubmitError(null);
          form.setNotice(null);
          void vibe.handleExtractVibe(collectionAssetIds).then((message) => {
            if (message) form.setNotice(message);
          });
        }}
        onVibeJsonChange={(text) => {
          improvement.promptImprovementRequestGateRef.current.invalidateInputs();
          vibe.handleVibeJsonChange(text);
        }}
        onFoldEnabledChange={(enabled) => {
          improvement.promptImprovementRequestGateRef.current.invalidateInputs();
          vibe.setFoldEnabled(enabled);
          vibe.setVibeFoldError(null);
        }}
        onFoldIntoVibe={() => {
          improvement.promptImprovementRequestGateRef.current.invalidateInputs();
          form.setNotice(null);
          void vibe.handleFoldIntoVibe(prompt).then((message) => {
            if (message) form.setNotice(message);
          });
        }}
      />
    ),
    continuitySection: (
      <GenerateContinuitySection
        show={selectedDefinition?.type === "video" && !isSwapSelected}
        videoReferenceFileId={videoReferenceFileId}
        videoSeedMissing={form.videoSeedMissing}
        disabled={Boolean(avatarId) || collectionAssetIds.length > 0}
        onClear={() => form.handleVideoReferenceChange(null)}
        onChange={form.handleVideoReferenceChange}
        onSeedMissingChange={form.setVideoSeedMissing}
      />
    ),
    swapSection: (
      <GenerateSwapSection
        show={isSwapSelected}
        modelId={selectedDefinition?.id}
        video={form.swapVideo}
        reference={form.swapReference}
        swapMode={form.swapMode}
        onChange={({ video, reference, swapMode: nextSwapMode }) => {
          improvement.promptImprovementRequestGateRef.current.invalidateInputs();
          form.setSwapVideo(video);
          form.setSwapReference(reference);
          form.setSwapMode(nextSwapMode);
        }}
      />
    ),
    swapReady: swapCanSubmit,
    swapSourceDurationSec: form.swapVideo?.durationSec ?? undefined,
    avatarName: avatarId
      ? vibeMode && vibe.vibeTemplate
        ? "Character identity + vibe JSON"
        : "Character identity"
      : videoReferenceFileId && !form.videoSeedMissing
        ? "Continuity seed"
        : collectionAssetIds.length > 0
          ? `${collectionAssetIds.length} collection reference${collectionAssetIds.length === 1 ? "" : "s"}`
          : null,
    vibeRequirement,
  };
}
