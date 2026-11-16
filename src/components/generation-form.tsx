"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, buttonClass } from "@/components/workbench";
import { userErrorMessage } from "@/lib/user-error-message";
import { GENERATE_LAYOUT } from "@/app/(app)/generate/form-constants";
import { GenerateFormControls } from "@/app/(app)/generate/form-controls";
import { GenerateIdentitySection } from "@/app/(app)/generate/form-identity-section";
import { buildGenerateFormView } from "@/app/(app)/generate/form-session";
import { GenerateFormSubmitBars } from "@/app/(app)/generate/form-submit-bars";
import type {
  GenerateFormActions,
  GenerateFormModel,
  GenerationFormProps,
} from "@/app/(app)/generate/form-types";
import { getGenerateFormViewModel } from "@/app/(app)/generate/form-view-model";
import {
  postImageGeneration,
  postSwapGeneration,
  postVideoGeneration,
} from "@/app/(app)/generate/generation-requests";
import { useGenerationForm } from "@/app/(app)/generate/use-generation-form";

export function GenerationForm({ models, initialQuery = "" }: GenerationFormProps) {
  const router = useRouter();
  const form = useGenerationForm(models, initialQuery);
  const { selectedDefinition, avatarId, videoReferenceFileId, collectionAssetIds, prompt, vibe, improvement } =
    form;

  if (models.length === 0) return <GenerateEmptyState />;

  const handleAvatarSelect = (id: string) => {
    improvement.promptImprovementRequestGateRef.current.invalidateInputs();
    const nextAvatarId = id || null;
    form.setSubmitError(null);
    form.setIdentityError(null);
    form.setAvatarId(nextAvatarId);
    if (!nextAvatarId) {
      vibe.resetVibeState();
    }
    if (nextAvatarId && videoReferenceFileId) {
      form.setVideoReferenceFileId(null);
      form.setNotice(
        "The video seed was cleared because character identity and continuity seeds cannot be combined yet."
      );
    }
    if (!nextAvatarId) {
      form.setIdentityPack(null);
      return;
    }

    const selectedSupportsIdentity =
      (selectedDefinition?.type === "image" &&
        selectedDefinition.capabilities.referenceImages === true) ||
      (selectedDefinition?.type === "video" &&
        Boolean(selectedDefinition.capabilities.characterReference));
    if (selectedSupportsIdentity) return;

    const fallback =
      selectedDefinition?.type === "video"
        ? models.find(
            (model) =>
              model.type === "video" && Boolean(model.capabilities.characterReference)
          )
        : models.find(
            (model) =>
              model.type === "image" && model.capabilities.referenceImages === true
          );
    if (fallback) {
      form.handleModelSelect(fallback.id);
      form.setAvatarId(nextAvatarId);
      form.setNotice(`${fallback.name} selected because it supports avatar identity.`);
    } else {
      form.setAvatarId(null);
      form.setIdentityError("No configured model supports character identity for this output type.");
    }
  };

  const handleSubmit = async () => {
    if (!form.canSubmit || !selectedDefinition || !form.swapCanSubmit) return;
    form.setIsSubmitting(true);
    form.setSubmitError(null);
    form.setNotice(null);

    try {
      if (selectedDefinition.capabilities.subjectSwap) {
        const result = await postSwapGeneration({
          prompt: prompt.trim(),
          modelId: selectedDefinition.id,
          swapVideoId: form.swapVideo?.id,
          swapReferenceId: form.swapReference?.id,
          swapMode: form.swapMode,
        });
        router.push(`/generate/${result.id}`);
        return;
      }
      if (selectedDefinition.type === "image") {
        const vibeTemplateActive =
          Boolean(avatarId) && collectionAssetIds.length > 0 && vibe.vibeTemplate;
        const result = await postImageGeneration({
          prompt: prompt.trim(),
          modelId: selectedDefinition.id,
          aspectRatio: form.aspectRatio,
          numImages: form.numImages,
          negativePrompt: form.negativePrompt.trim() || undefined,
          enableWebSearch: avatarId ? undefined : form.enableWebSearch,
          avatarId: avatarId ?? undefined,
          collectionAssetIds:
            !avatarId && collectionAssetIds.length > 0
              ? collectionAssetIds
              : undefined,
          styleTemplate: vibeTemplateActive ? vibe.vibeTemplate ?? undefined : undefined,
          styleTemplateFolded:
            vibeTemplateActive && vibe.foldEnabled ? true : undefined,
        });
        router.push(`/generate/${result.id}`);
      } else {
        const result = await postVideoGeneration({
          prompt: prompt.trim(),
          modelId: selectedDefinition.id,
          aspectRatio: form.aspectRatio,
          duration: form.duration,
          enableAudio:
            form.enableAudio && selectedDefinition.capabilities.nativeAudio === true,
          avatarId: avatarId ?? undefined,
          negativePrompt: form.negativePrompt.trim() || undefined,
          collectionAssetIds:
            collectionAssetIds.length > 0 ? collectionAssetIds.slice(0, 1) : undefined,
          referenceFileId: videoReferenceFileId ?? undefined,
        });
        router.push(`/generate/${result.id}`);
      }
    } catch (error) {
      form.setSubmitError(userErrorMessage(error, "Generation could not be started."));
      form.setIsSubmitting(false);
    }
  };

  return (
    <GenerateFormView
      {...buildGenerateFormView({
        models,
        form,
        onSubmit: handleSubmit,
        identitySection: (
          <GenerateIdentitySection
            view={{
              show:
                selectedDefinition?.type !== "video" ||
                Boolean(selectedDefinition.capabilities.characterReference),
              isVideo: selectedDefinition?.type === "video",
              avatarId,
              identityStatus: form.identityStatus,
              identityError: form.identityError,
            }}
            actions={{ onSelect: handleAvatarSelect }}
          />
        ),
      })}
    />
  );
}

export function GenerateEmptyState() {
  return (
    <EmptyState
      icon="generate"
      title="No generation models available"
      detail="Model configuration could not be loaded."
      className="min-h-96"
    >
      <Link href="/ugc-clone" className={buttonClass("strong")}>
        Open Clone
      </Link>
      <Link href="/" className={buttonClass("quiet")}>
        Return Home
      </Link>
    </EmptyState>
  );
}

export function GenerateFormView({
  form,
  actions,
}: {
  form: GenerateFormModel;
  actions: GenerateFormActions;
}) {
  const view = getGenerateFormViewModel(form);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        actions.onSubmit();
      }}
      className={`wb-fade-in ${GENERATE_LAYOUT.root}`}
    >
      <GenerateFormControls form={form} actions={actions} view={view} />
      <GenerateFormSubmitBars
        form={form}
        view={view}
        className="wb-stuck-fade sticky bottom-0 z-20 max-xl:pb-[max(12px,env(safe-area-inset-bottom))] xl:bottom-auto xl:top-4 xl:z-auto"
      />
    </form>
  );
}
