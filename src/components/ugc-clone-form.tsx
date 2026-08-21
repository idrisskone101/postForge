"use client";

import { CloneActionBar } from "@/components/clone/action-bar";
import { CloneIdentityStep } from "@/components/clone/identity-step";
import { CloneLiveComposition } from "@/components/clone/live-composition";
import { CloneProductionStatePanel } from "@/components/clone/production-state";
import { CloneReferenceReview } from "@/components/clone/reference-review";
import { CloneReferenceStep } from "@/components/clone/reference-step";
import { CloneSetupNav } from "@/components/clone/setup-nav";
import { CloneSourceEmptyState } from "@/components/clone/source-empty-state";
import { CloneIdentityStatusPanel } from "@/components/clone/identity-status";
import { CloneSourceStep } from "@/components/clone/source-step";
import type { RefImageEntry } from "@/components/clone/types";
import { useCloneForm } from "@/app/ugc-clone/use-clone-form";

export type { RefImageEntry };
export { CloneSourceEmptyState, CloneIdentityStatusPanel, CloneProductionStatePanel };

export function UGCCloneForm() {
  const form = useCloneForm();
  const { view, identity, refs } = form;

  const productionStatePanel = (
    <CloneProductionStatePanel
      sourceReady={view.sourceReady}
      trimReady={view.trimReady}
      identityReady={view.avatarReady}
      referenceReady={view.referenceReady}
      canGenerate={view.canGenerateClone}
      nextAction={view.nextAction}
      sourceDetail={view.sourceDetail}
      trimDetail={view.trimDetail}
      identityDetail={view.identityDetail}
      referenceDetail={view.referenceDetail}
      readinessDetail={view.readinessDetail}
    />
  );

  if (form.phase === "reviewing") {
    const selectedRef = view.selectedRef;
    return (
      <CloneReferenceReview
        modelName={view.modelName}
        videoInfo={form.videoInfo}
        sourcePreviewSrc={view.sourcePreviewSrc}
        durationSec={view.durationSec}
        refImages={refs.refImages}
        selectedRef={selectedRef}
        selectedRefIndex={refs.selectedRefIndex}
        selectedRefFileId={view.selectedRefFileId}
        refPrompt={refs.refPrompt}
        totalRefCost={view.totalRefCost}
        referenceBatchCost={form.referenceBatchCost}
        videoCost={form.videoCost}
        textErasureCost={form.textErasureCost}
        isSubmitting={form.isSubmitting}
        isGenerating={view.isGenerating}
        hasAnyCompleted={view.hasAnyCompleted}
        submitError={form.submitError}
        productionStatePanel={productionStatePanel}
        promptUsed={
          selectedRef && selectedRef.prompt ? (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="mb-1 text-[12px] uppercase tracking-widest text-muted-foreground">
                Prompt used for #{refs.selectedRefIndex + 1}
              </p>
              <p className="min-w-0 break-words text-xs italic leading-relaxed text-foreground/80 [overflow-wrap:anywhere] line-clamp-3">
                {selectedRef.prompt || "(no additional prompt)"}
              </p>
            </div>
          ) : null
        }
        onBack={form.handleBackToInput}
        onSelectVariant={refs.setSelectedRefIndex}
        onRefPromptChange={refs.setRefPrompt}
        onRegenerate={() => void form.submitRefImageGeneration(refs.refPrompt)}
        onApprove={form.handleApproveAndGenerate}
      />
    );
  }

  if (form.phase !== "input" && form.phase !== "submitted") {
    const _exhaustive: never = form.phase;
    return _exhaustive;
  }

  return (
    <>
      <div
        data-clone-production-state="true"
        data-active-clone-step={form.activeSetupStep}
        className="space-y-4 pb-28"
      >
        <CloneSetupNav
          activeSetupStep={form.activeSetupStep}
          completedSetupSteps={view.completedSetupSteps}
          onSelectStep={form.setActiveSetupStep}
        />

        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(420px,45fr)_minmax(0,55fr)]">
          <CloneSourceStep
            hidden={form.activeSetupStep !== "source"}
            sourceReady={view.sourceReady}
            videoInfo={form.videoInfo}
            originalVideoInfo={form.originalVideoInfo}
            sourcePreviewSrc={view.sourcePreviewSrc}
            showTrimmer={form.showTrimmer}
            sourceToolsOpen={form.sourceToolsOpen}
            shouldShowSourceTools={view.shouldShowSourceTools}
            sourcesRefreshKey={form.sourcesRefreshKey}
            pendingSourceId={form.pendingSourceId}
            onToggleTrim={() => {
              if (form.showTrimmer) {
                form.handleCancelTrim();
                return;
              }
              form.setSourceToolsOpen(false);
              form.setShowTrimmer(true);
            }}
            onTogglePicker={() => {
              if (view.sourceReady) {
                form.setShowTrimmer(false);
                form.setSourceToolsOpen((value) => !value);
                return;
              }
              form.setSourceToolsOpen(true);
            }}
            onTrimmed={form.handleTrimmed}
            onCancelTrim={form.handleCancelTrim}
            onVideoDownloaded={form.handleVideoDownloaded}
            onPreselectedSourceResolved={form.handlePreselectedSourceResolved}
          />

          <CloneIdentityStep
            hidden={form.activeSetupStep !== "identity"}
            avatarId={identity.avatarId}
            avatarReady={view.avatarReady}
            identityPack={identity.identityPack}
            isStartingIdentityPack={identity.isStartingIdentityPack}
            isGeneratingHairstyles={identity.isGeneratingHairstyles}
            identityPackError={identity.identityPackError}
            onGenerateHairstyles={() => {
              if (identity.avatarId) {
                void identity.generateHairstyleVariants(identity.avatarId);
              }
            }}
            onRetry={() => {
              if (identity.avatarId) {
                void identity.startIdentityPack(identity.avatarId, true);
              }
            }}
            onSelectAvatar={form.handleSelectAvatar}
          />

          <CloneReferenceStep
            hidden={form.activeSetupStep !== "reference"}
            sourceReady={view.sourceReady}
            videoInfo={form.videoInfo}
            sourcePreviewSrc={view.sourcePreviewSrc}
            durationSec={view.durationSec}
            selectedCollectionAssetId={form.selectedCollectionAssetId}
            selectedSavedReference={view.selectedSavedReference}
            selectedSavedReferenceId={identity.selectedSavedReferenceId}
            selectedRef={view.selectedRef}
            selectedRefIndex={refs.selectedRefIndex}
            primaryAvatarReference={view.primaryAvatarReference}
            identityPack={identity.identityPack}
            isStartingIdentityPack={identity.isStartingIdentityPack}
            hairstyleOptions={view.hairstyleOptions}
            selectedHairstyleRole={identity.selectedHairstyleRole}
            referenceBatchSize={form.referenceBatchSize}
            referenceBatchCost={form.referenceBatchCost}
            isSubmitting={form.isSubmitting}
            isGenerating={view.isGenerating}
            referenceReady={view.referenceReady}
            submitError={form.submitError}
            refImages={refs.refImages}
            isLoadingSavedReferences={identity.isLoadingSavedReferences}
            savedReferencesError={identity.savedReferencesError}
            savedReferences={identity.savedReferences}
            savedReferencesNextCursor={identity.savedReferencesNextCursor}
            isLoadingMoreSavedReferences={identity.isLoadingMoreSavedReferences}
            referenceLibraryOpen={form.referenceLibraryOpen}
            showAvatarReferences={identity.showAvatarReferences}
            avatarReferencePreviews={view.avatarReferencePreviews}
            onClearCollection={() => form.setSelectedCollectionAssetId(null)}
            onClearSavedReference={() => identity.setSelectedSavedReferenceId(null)}
            onSelectHairstyleRole={(role) => identity.setSelectedHairstyleRole(role)}
            onSelectBatchSize={form.setReferenceBatchSize}
            onCollectionChange={form.handleCollectionChange}
            onSelectGenerated={(index) => {
              identity.setSelectedSavedReferenceId(null);
              form.setSelectedCollectionAssetId(null);
              refs.setSelectedRefIndex(index);
            }}
            onToggleLibrary={() => {
              form.setReferenceLibraryOpen((open) => !open);
            }}
            onSelectSavedReference={form.handleSelectSavedReference}
            onLoadMore={() => void identity.loadMoreSavedReferences()}
            onToggleAvatarReferences={() =>
              identity.setShowAvatarReferences((current) => !current)
            }
          />

          <CloneLiveComposition
            activeStep={form.activeSetupStep}
            videoInfo={form.videoInfo}
            sourcePreviewSrc={view.sourcePreviewSrc}
            avatarId={identity.avatarId}
            selectedReference={view.selectedSavedReference}
            selectedGeneratedReference={view.selectedRef}
            collectionReferenceUrl={
              form.selectedCollectionAssetId
                ? `/api/files/${encodeURIComponent(form.selectedCollectionAssetId)}`
                : null
            }
            sourceReady={view.sourceReady}
            identityReady={view.avatarReady}
            referenceReady={view.referenceReady}
            onJumpToStep={form.setActiveSetupStep}
          />
        </div>
      </div>

      <CloneActionBar
        cloneTip={form.cloneTip}
        mobileSettingsOpen={form.mobileSettingsOpen}
        cloneVideoModels={form.cloneVideoModels}
        referenceImageModels={form.referenceImageModels}
        selectedModel={form.selectedModel}
        selectedReferenceImageModel={form.selectedReferenceImageModel}
        keepOriginalSound={form.keepOriginalSound}
        removeTextOverlays={form.removeTextOverlays}
        durationSec={view.durationSec}
        referenceBatchSize={form.referenceBatchSize}
        textErasureCost={form.textErasureCost}
        totalRefCost={view.totalRefCost}
        referenceBatchCost={form.referenceBatchCost}
        videoCost={form.videoCost}
        isSubmitting={form.isSubmitting}
        isGenerating={view.isGenerating}
        compactActionLabel={view.compactActionLabel}
        primaryActionDisabled={view.primaryActionDisabled}
        onToggleMobileSettings={() => form.setMobileSettingsOpen((open) => !open)}
        onCloseMobileSettings={() => form.setMobileSettingsOpen(false)}
        onSelectModel={form.setSelectedModel}
        onSelectReferenceImageModel={form.setSelectedReferenceImageModel}
        onToggleSound={form.setKeepOriginalSound}
        onToggleTextOverlays={form.setRemoveTextOverlays}
        onPrimaryAction={form.handlePrimaryAction}
      />
    </>
  );
}
