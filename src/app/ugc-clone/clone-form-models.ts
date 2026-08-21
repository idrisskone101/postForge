import type { Dispatch, SetStateAction } from "react";
import type { TikTokVideoInfo } from "@/components/tiktok-input";
import type { ReferenceBatchSize } from "@/components/clone/constants";
import type {
  CloneActionModel,
  CloneDraft,
  ClonePreselectedSourceResult,
  CloneReferenceWorkspace,
  CloneTrimResult,
} from "@/components/clone/view-models";
import type { ModelDefinition } from "@/lib/ai/types";
import { getCloneStudioViewModel } from "@/app/ugc-clone/clone-view-model";
import type { useCloneIdentity } from "@/app/ugc-clone/use-clone-identity";
import type { useCloneRefImages } from "@/app/ugc-clone/use-clone-ref-images";

type CloneStudioView = ReturnType<typeof getCloneStudioViewModel>;
type CloneIdentityState = ReturnType<typeof useCloneIdentity>;
type CloneRefImageState = ReturnType<typeof useCloneRefImages>;

export type CloneFormSnapshot = {
  activeSetupStep: CloneDraft["activeSetupStep"];
  setActiveSetupStep: (step: CloneDraft["activeSetupStep"]) => void;
  videoInfo: TikTokVideoInfo | null;
  originalVideoInfo: TikTokVideoInfo | null;
  showTrimmer: boolean;
  sourceToolsOpen: boolean;
  setShowTrimmer: Dispatch<SetStateAction<boolean>>;
  setSourceToolsOpen: Dispatch<SetStateAction<boolean>>;
  sourcesRefreshKey: number;
  pendingSourceId: string | null;
  selectedCollectionAssetId: string | null;
  setSelectedCollectionAssetId: (id: string | null) => void;
  referenceLibraryOpen: boolean;
  setReferenceLibraryOpen: Dispatch<SetStateAction<boolean>>;
  mobileSettingsOpen: boolean;
  setMobileSettingsOpen: Dispatch<SetStateAction<boolean>>;
  keepOriginalSound: boolean;
  setKeepOriginalSound: Dispatch<SetStateAction<boolean>>;
  removeTextOverlays: boolean;
  setRemoveTextOverlays: Dispatch<SetStateAction<boolean>>;
  selectedModel: string;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  selectedReferenceImageModel: string;
  setSelectedReferenceImageModel: Dispatch<SetStateAction<string>>;
  referenceBatchSize: ReferenceBatchSize;
  setReferenceBatchSize: Dispatch<SetStateAction<ReferenceBatchSize>>;
  cloneTip: CloneActionModel["cloneTip"];
  isSubmitting: boolean;
  submitError: string | null;
  cloneVideoModels: ModelDefinition[];
  referenceImageModels: ModelDefinition[];
  videoCost: number;
  referenceBatchCost: number;
  textErasureCost: number;
  identity: CloneIdentityState;
  refs: CloneRefImageState;
  view: CloneStudioView;
  handleVideoDownloaded: (info: TikTokVideoInfo | null) => void;
  handlePreselectedSourceResolved: (result: ClonePreselectedSourceResult) => void;
  handleTrimmed: (info: CloneTrimResult) => void;
  handleCancelTrim: () => void;
  handleApproveAndGenerate: () => void;
  handleBackToInput: () => void;
  handleCollectionChange: (assetIds: string[]) => void;
  handlePrimaryAction: () => void;
  handleSelectAvatar: (nextAvatarId: string) => void;
  handleSelectSavedReference: (referenceId: string) => void;
  submitRefImageGeneration: (prompt: string) => Promise<void>;
};

function productionState(snapshot: CloneFormSnapshot) {
  const { view } = snapshot;
  return {
    sourceReady: view.sourceReady,
    trimReady: view.trimReady,
    identityReady: view.avatarReady,
    referenceReady: view.referenceReady,
    canGenerate: view.canGenerateClone,
    nextAction: view.nextAction,
    sourceDetail: view.sourceDetail,
    trimDetail: view.trimDetail,
    identityDetail: view.identityDetail,
    referenceDetail: view.referenceDetail,
    readinessDetail: view.readinessDetail,
  };
}

export function buildCloneDraft(snapshot: CloneFormSnapshot): CloneDraft {
  const { view, identity } = snapshot;
  return {
    ...productionState(snapshot),
    activeSetupStep: snapshot.activeSetupStep,
    completedSetupSteps: view.completedSetupSteps,
    onSelectStep: snapshot.setActiveSetupStep,
    videoInfo: snapshot.videoInfo,
    originalVideoInfo: snapshot.originalVideoInfo,
    sourcePreviewSrc: view.sourcePreviewSrc,
    showTrimmer: snapshot.showTrimmer,
    sourceToolsOpen: snapshot.sourceToolsOpen,
    shouldShowSourceTools: view.shouldShowSourceTools,
    sourcesRefreshKey: snapshot.sourcesRefreshKey,
    pendingSourceId: snapshot.pendingSourceId,
    onToggleTrim: () => {
      if (snapshot.showTrimmer) {
        snapshot.handleCancelTrim();
        return;
      }
      snapshot.setSourceToolsOpen(false);
      snapshot.setShowTrimmer(true);
    },
    onTogglePicker: () => {
      if (view.sourceReady) {
        snapshot.setShowTrimmer(false);
        snapshot.setSourceToolsOpen((open) => !open);
        return;
      }
      snapshot.setSourceToolsOpen(true);
    },
    onTrimmed: snapshot.handleTrimmed,
    onCancelTrim: snapshot.handleCancelTrim,
    onVideoDownloaded: snapshot.handleVideoDownloaded,
    onPreselectedSourceResolved: snapshot.handlePreselectedSourceResolved,
    avatarId: identity.avatarId,
    avatarReady: view.avatarReady,
    identityPack: identity.identityPack,
    isStartingIdentityPack: identity.isStartingIdentityPack,
    isGeneratingHairstyles: identity.isGeneratingHairstyles,
    identityPackError: identity.identityPackError,
    onGenerateHairstyles: () => {
      if (identity.avatarId) {
        void identity.generateHairstyleVariants(identity.avatarId);
      }
    },
    onRetry: () => {
      if (identity.avatarId) {
        void identity.startIdentityPack(identity.avatarId, true);
      }
    },
    onSelectAvatar: snapshot.handleSelectAvatar,
    selectedSavedReference: view.selectedSavedReference,
    selectedGeneratedReference: view.selectedRef,
    collectionReferenceUrl: snapshot.selectedCollectionAssetId
      ? `/api/files/${encodeURIComponent(snapshot.selectedCollectionAssetId)}`
      : null,
  };
}

export function buildCloneReferenceWorkspace(
  snapshot: CloneFormSnapshot
): CloneReferenceWorkspace {
  const { view, identity, refs } = snapshot;
  return {
    ...productionState(snapshot),
    videoInfo: snapshot.videoInfo,
    sourcePreviewSrc: view.sourcePreviewSrc,
    durationSec: view.durationSec,
    selectedCollectionAssetId: snapshot.selectedCollectionAssetId,
    selectedSavedReference: view.selectedSavedReference,
    selectedSavedReferenceId: identity.selectedSavedReferenceId,
    selectedRef: view.selectedRef,
    selectedRefIndex: refs.selectedRefIndex,
    primaryAvatarReference: view.primaryAvatarReference,
    identityPack: identity.identityPack,
    isStartingIdentityPack: identity.isStartingIdentityPack,
    hairstyleOptions: view.hairstyleOptions,
    selectedHairstyleRole: identity.selectedHairstyleRole,
    referenceBatchSize: snapshot.referenceBatchSize,
    referenceBatchCost: snapshot.referenceBatchCost,
    isSubmitting: snapshot.isSubmitting,
    isGenerating: view.isGenerating,
    submitError: snapshot.submitError,
    refImages: refs.refImages,
    isLoadingSavedReferences: identity.isLoadingSavedReferences,
    savedReferencesError: identity.savedReferencesError,
    savedReferences: identity.savedReferences,
    savedReferencesNextCursor: identity.savedReferencesNextCursor,
    isLoadingMoreSavedReferences: identity.isLoadingMoreSavedReferences,
    referenceLibraryOpen: snapshot.referenceLibraryOpen,
    showAvatarReferences: identity.showAvatarReferences,
    avatarReferencePreviews: view.avatarReferencePreviews,
    onClearCollection: () => snapshot.setSelectedCollectionAssetId(null),
    onClearSavedReference: () => identity.setSelectedSavedReferenceId(null),
    onSelectHairstyleRole: (role) => identity.setSelectedHairstyleRole(role),
    onSelectBatchSize: snapshot.setReferenceBatchSize,
    onCollectionChange: snapshot.handleCollectionChange,
    onSelectGenerated: (index) => {
      identity.setSelectedSavedReferenceId(null);
      snapshot.setSelectedCollectionAssetId(null);
      refs.setSelectedRefIndex(index);
    },
    onToggleLibrary: () => {
      snapshot.setReferenceLibraryOpen((open) => !open);
    },
    onSelectSavedReference: snapshot.handleSelectSavedReference,
    onLoadMore: () => {
      void identity.loadMoreSavedReferences();
    },
    onToggleAvatarReferences: () => {
      identity.setShowAvatarReferences((open) => !open);
    },
    modelName: view.modelName,
    selectedRefFileId: view.selectedRefFileId,
    refPrompt: refs.refPrompt,
    totalRefCost: view.totalRefCost,
    videoCost: snapshot.videoCost,
    textErasureCost: snapshot.textErasureCost,
    hasAnyCompleted: view.hasAnyCompleted,
    onBack: snapshot.handleBackToInput,
    onSelectVariant: refs.setSelectedRefIndex,
    onRefPromptChange: refs.setRefPrompt,
    onRegenerate: () => {
      void snapshot.submitRefImageGeneration(refs.refPrompt);
    },
    onApprove: snapshot.handleApproveAndGenerate,
  };
}

export function buildCloneActionModel(snapshot: CloneFormSnapshot): CloneActionModel {
  const { view } = snapshot;
  return {
    cloneTip: snapshot.cloneTip,
    mobileSettingsOpen: snapshot.mobileSettingsOpen,
    cloneVideoModels: snapshot.cloneVideoModels,
    referenceImageModels: snapshot.referenceImageModels,
    selectedModel: snapshot.selectedModel,
    selectedReferenceImageModel: snapshot.selectedReferenceImageModel,
    keepOriginalSound: snapshot.keepOriginalSound,
    removeTextOverlays: snapshot.removeTextOverlays,
    durationSec: view.durationSec,
    referenceBatchSize: snapshot.referenceBatchSize,
    textErasureCost: snapshot.textErasureCost,
    totalRefCost: view.totalRefCost,
    referenceBatchCost: snapshot.referenceBatchCost,
    videoCost: snapshot.videoCost,
    isSubmitting: snapshot.isSubmitting,
    isGenerating: view.isGenerating,
    compactActionLabel: view.compactActionLabel,
    primaryActionDisabled: view.primaryActionDisabled,
    onToggleMobileSettings: () => {
      snapshot.setMobileSettingsOpen((open) => !open);
    },
    onCloseMobileSettings: () => snapshot.setMobileSettingsOpen(false),
    onSelectModel: snapshot.setSelectedModel,
    onSelectReferenceImageModel: snapshot.setSelectedReferenceImageModel,
    onToggleSound: snapshot.setKeepOriginalSound,
    onToggleTextOverlays: snapshot.setRemoveTextOverlays,
    onPrimaryAction: snapshot.handlePrimaryAction,
  };
}
