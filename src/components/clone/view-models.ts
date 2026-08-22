import type { TikTokVideoInfo } from "@/components/tiktok-input";
import type { ReferenceBatchSize } from "@/components/clone/constants";
import type {
  AvatarIdentityPack,
  AvatarReferencePreview,
  CloneSetupStep,
  RefImageEntry,
  SavedReference,
} from "@/components/clone/types";
import type { ModelDefinition } from "@/lib/ai/types";
import type { ClonePrimaryAction } from "@/lib/ugc/clone-workflow";

export type CloneTrimResult = {
  localPath: string;
  filename: string;
  durationSec: number;
  width: number;
  height: number;
};

export type ClonePreselectedSourceResult = {
  status: "selected" | "missing";
  sourceId?: string;
  sourceUrl?: string;
};

export type CloneProductionState = {
  sourceReady: boolean;
  trimReady: boolean;
  identityReady: boolean;
  referenceReady: boolean;
  canGenerate: boolean;
  nextAction: ClonePrimaryAction;
  sourceDetail?: string;
  trimDetail?: string;
  identityDetail?: string;
  referenceDetail?: string;
  readinessDetail?: string;
};

export type CloneIdentityModel = {
  avatarReady: boolean;
  identityPack: AvatarIdentityPack | null;
  isStartingIdentityPack: boolean;
  isGeneratingHairstyles?: boolean;
  identityPackError: string | null;
  onGenerateHairstyles?: () => void;
  onRetry: () => void;
};

export type CloneDraft = CloneProductionState &
  CloneIdentityModel & {
    activeSetupStep: CloneSetupStep;
    completedSetupSteps: Set<CloneSetupStep>;
    onSelectStep: (step: CloneSetupStep) => void;
    videoInfo: TikTokVideoInfo | null;
    originalVideoInfo: TikTokVideoInfo | null;
    sourcePreviewSrc: string | null;
    showTrimmer: boolean;
    sourceToolsOpen: boolean;
    shouldShowSourceTools: boolean;
    sourcesRefreshKey: number;
    pendingSourceId: string | null;
    pendingSourceUrl: string | null;
    onToggleTrim: () => void;
    onTogglePicker: () => void;
    onTrimmed: (info: CloneTrimResult) => void;
    onCancelTrim: () => void;
    onVideoDownloaded: (info: TikTokVideoInfo | null) => void;
    onPreselectedSourceResolved: (result: ClonePreselectedSourceResult) => void;
    avatarId: string | null;
    onSelectAvatar: (nextAvatarId: string) => void;
    selectedSavedReference: SavedReference | null;
    selectedGeneratedReference: RefImageEntry | null;
    collectionReferenceUrl: string | null;
  };

export type CloneReferenceWorkspace = CloneProductionState & {
  videoInfo: TikTokVideoInfo | null;
  sourcePreviewSrc: string | null;
  durationSec: number;
  selectedCollectionAssetId: string | null;
  selectedSavedReference: SavedReference | null;
  selectedSavedReferenceId: string | null;
  selectedRef: RefImageEntry | null;
  selectedRefIndex: number;
  primaryAvatarReference: AvatarReferencePreview | null;
  identityPack: AvatarIdentityPack | null;
  isStartingIdentityPack: boolean;
  hairstyleOptions: AvatarIdentityPack["images"];
  selectedHairstyleRole: string | null;
  referenceBatchSize: ReferenceBatchSize;
  referenceBatchCost: number;
  isSubmitting: boolean;
  isGenerating: boolean;
  submitError: string | null;
  refImages: RefImageEntry[];
  isLoadingSavedReferences: boolean;
  savedReferencesError: string | null;
  savedReferences: SavedReference[];
  savedReferencesNextCursor: string | null;
  isLoadingMoreSavedReferences: boolean;
  referenceLibraryOpen: boolean;
  showAvatarReferences: boolean;
  avatarReferencePreviews: AvatarReferencePreview[];
  onClearCollection: () => void;
  onClearSavedReference: () => void;
  onSelectHairstyleRole: (role: string | null) => void;
  onSelectBatchSize: (size: ReferenceBatchSize) => void;
  onCollectionChange: (assetIds: string[]) => void;
  onSelectGenerated: (index: number) => void;
  onToggleLibrary: () => void;
  onSelectSavedReference: (referenceId: string) => void;
  onLoadMore: () => void;
  onToggleAvatarReferences: () => void;
  modelName: string;
  selectedRefFileId: string | null;
  refPrompt: string;
  totalRefCost: number;
  videoCost: number;
  textErasureCost: number;
  hasAnyCompleted: boolean;
  onBack: () => void;
  onSelectVariant: (index: number) => void;
  onRefPromptChange: (value: string) => void;
  onRegenerate: () => void;
  onApprove: () => void;
};

export type CloneActionModel = {
  cloneTip: { title: string; body: string };
  mobileSettingsOpen: boolean;
  cloneVideoModels: ModelDefinition[];
  referenceImageModels: ModelDefinition[];
  selectedModel: string;
  selectedReferenceImageModel: string;
  keepOriginalSound: boolean;
  removeTextOverlays: boolean;
  durationSec: number;
  referenceBatchSize: ReferenceBatchSize;
  textErasureCost: number;
  totalRefCost: number;
  referenceBatchCost: number;
  videoCost: number;
  isSubmitting: boolean;
  isGenerating: boolean;
  compactActionLabel: string;
  primaryActionDisabled: boolean;
  onToggleMobileSettings: () => void;
  onCloseMobileSettings: () => void;
  onSelectModel: (value: string) => void;
  onSelectReferenceImageModel: (value: string) => void;
  onToggleSound: (checked: boolean) => void;
  onToggleTextOverlays: (checked: boolean) => void;
  onPrimaryAction: () => void;
};

export type CloneModelSelectModel = {
  label: string;
  description: string;
  accentClassName: string;
  models: ModelDefinition[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  getCost: (modelId: string) => string;
};
