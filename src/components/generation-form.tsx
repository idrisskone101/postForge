"use client";

import { Sparkles, ImageIcon, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { WorkspaceState } from "@/components/workspace-state";
import { userErrorMessage } from "@/lib/user-error-message";
import { cn } from "@/lib/utils";
import { GenerateFormControls } from "@/app/generate/form-controls";
import { GenerateIdentitySection } from "@/app/generate/form-identity-section";
import { buildGenerateFormView } from "@/app/generate/form-session";
import { GenerateFormSubmitBars } from "@/app/generate/form-submit-bars";
import type {
  GenerateFormActions,
  GenerateFormModel,
  GenerationFormProps,
} from "@/app/generate/form-types";
import { getGenerateFormViewModel } from "@/app/generate/form-view-model";
import {
  postImageGeneration,
  postSwapGeneration,
  postVideoGeneration,
} from "@/app/generate/generation-requests";
import { useGenerationForm } from "@/app/generate/use-generation-form";

export function GenerateEmptyState() {
  return (
    <WorkspaceState
      tone="empty"
      icon={Sparkles}
      title="No generation models available"
      description="Model configuration could not be loaded. Use Clone or return Home while the Generate engines are unavailable."
      action={{ href: "/ugc-clone", label: "Open Clone" }}
      secondaryAction={{ href: "/", label: "Return Home" }}
      className="min-h-96"
    />
  );
}

export function GenerationForm({ models }: GenerationFormProps) {
  const router = useRouter();
  const form = useGenerationForm(models);
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
            show={
              selectedDefinition?.type !== "video" ||
              Boolean(selectedDefinition.capabilities.characterReference)
            }
            isVideo={selectedDefinition?.type === "video"}
            videoDescription="Create an identity-locked opening frame, then bind the same character through the video."
            imageDescription="Reuse a saved identity. A compatible image model is selected automatically."
            avatarId={avatarId}
            identityStatus={form.identityStatus}
            identityError={form.identityError}
            onSelect={handleAvatarSelect}
          />
        ),
      })}
    />
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
  const { prompt, aspectRatio, numImages } = form;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        actions.onSubmit();
      }}
      className="grid items-start gap-4 pb-20 md:pb-0 xl:grid-cols-[minmax(360px,0.72fr)_minmax(500px,1.28fr)]"
    >
      <span className="sr-only">
        Creative Prompt Model Selection Current Config {view.isImage ? `${numImages} img` : ""}
      </span>

      <GenerateFormControls form={form} actions={actions} view={view} />

      <aside className="min-w-0 overflow-hidden rounded-[8px] border border-border bg-white shadow-[var(--pf-shadow-sm)] xl:sticky xl:top-4">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <span className="text-[13px] font-semibold text-foreground">Preview</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pf-active)] px-2 py-1 text-[13px] font-semibold text-muted-foreground">
            {view.isVideo ? <Video className="size-3" /> : <ImageIcon className="size-3" />}
            {view.ratioLabel}
          </span>
        </div>

        <div className="grid min-h-[470px] place-items-center bg-[#09090B] p-5 sm:min-h-[560px] sm:p-8 xl:min-h-[590px]">
          <div
            aria-label={`${aspectRatio} output preview`}
            className={cn(
              "relative grid max-h-[520px] min-h-[220px] place-items-center overflow-hidden rounded-lg border border-white/10",
              view.previewWidthClass
            )}
            style={{ aspectRatio: aspectRatio.replace(":", " / ") }}
          >
            <div className="relative mx-6 min-w-0 max-w-full text-center">
              <Sparkles className="mx-auto size-5 text-[var(--pf-orange)]" />
              <strong className="mt-3 block text-[13px] font-semibold text-white">
                {view.model ? "Ready to generate" : "Choose a model"}
              </strong>
              <span className="mt-1.5 block min-w-0 max-w-52 break-words text-[12px] leading-4 text-white/50 [overflow-wrap:anywhere]">
                {prompt.trim()
                  ? prompt.trim().slice(0, 112)
                  : "Your prompt and output settings will appear here before submission."}
              </span>
            </div>
            {view.model && (
              <span className="absolute bottom-3 left-3 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                {view.model.name}
              </span>
            )}
          </div>
        </div>

        <GenerateFormSubmitBars
          form={form}
          view={view}
          desktopBarClassName="sticky bottom-0 hidden gap-3 border-t border-border bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        />
      </aside>
    </form>
  );
}
