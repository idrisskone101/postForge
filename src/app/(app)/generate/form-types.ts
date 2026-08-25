import type { ReactNode } from "react";
import type { SwapUploadedAsset } from "@/components/swap-input-section";
import type { ModelDefinition, SwapMode } from "@/lib/ai/types";

export interface GenerationFormProps {
  models: ModelDefinition[];
  initialQuery?: string;
}

export interface GenerateFormModel {
  models: ModelDefinition[];
  selectedModel: string | null;
  prompt: string;
  aspectRatio: string;
  numImages: number;
  duration?: number;
  negativePrompt: string;
  enableWebSearch: boolean;
  enableAudio: boolean;
  isSubmitting: boolean;
  isImprovingPrompt?: boolean;
  advancedOpen: boolean;
  submitError?: string | null;
  notice?: string | null;
  promptImprovementError?: string | null;
  promptImprovementNotice?: string | null;
  promptEnhancerConfigured?: boolean | null;
  canUndoPromptImprovement?: boolean;
  avatarSection?: ReactNode;
  referenceSection?: ReactNode;
  continuitySection?: ReactNode;
  swapSection?: ReactNode;
  swapReady?: boolean;
  swapSourceDurationSec?: number;
  avatarName?: string | null;
  vibeRequirement?: string | null;
}

export interface GenerateFormActions {
  onModelSelect: (modelId: string) => void;
  onPromptChange: (prompt: string) => void;
  onAspectRatioChange: (ratio: string) => void;
  onNumImagesChange: (numImages: number) => void;
  onDurationChange?: (duration: number) => void;
  onNegativePromptChange: (prompt: string) => void;
  onEnableWebSearchChange: (enabled: boolean) => void;
  onEnableAudioChange: (enabled: boolean) => void;
  onAdvancedOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onImprovePrompt?: () => void;
  onUndoPromptImprovement?: () => void;
  onAppendToPrompt: (text: string) => void;
}

export interface GenerateCollectionModel {
  avatarId: string | null;
  collectionAssetIds: string[];
  maxSelection: number;
  disabled: boolean;
  vibeMode: boolean;
  vibeExtracting: boolean;
  vibeExtractError: string | null;
  vibeStale: boolean;
  vibeEditorActive: boolean;
  vibeJsonText: string;
  vibeJsonError: string | null;
  vibeTemplate: unknown;
  foldEnabled: boolean;
  vibeFolding: boolean;
  vibeFoldError: string | null;
  foldStale: boolean;
  foldedPromptValue: string | null;
  prompt: string;
}

export interface GenerateCollectionActions {
  onClear: () => void;
  onCollectionChange: (assetIds: string[]) => void;
  onExtractVibe: () => void;
  onVibeJsonChange: (text: string) => void;
  onFoldEnabledChange: (enabled: boolean) => void;
  onFoldIntoVibe: () => void;
}

export interface GenerateContinuityView {
  show: boolean;
  videoReferenceFileId: string | null;
  videoSeedMissing: boolean;
  disabled: boolean;
}

export interface GenerateContinuityActions {
  onClear: () => void;
  onChange: (fileId: string | null) => void;
  onSeedMissingChange: (missing: boolean) => void;
}

export interface GenerateIdentityView {
  show: boolean;
  isVideo: boolean;
  avatarId: string | null;
  identityStatus: {
    label: string;
    tone: "ready" | "working" | "failed";
  };
  identityError: string | null;
}

export interface GenerateIdentityActions {
  onSelect: (id: string) => void;
}

export interface GenerateSwapView {
  show: boolean;
  modelId: string | undefined;
  video: SwapUploadedAsset | null;
  reference: SwapUploadedAsset | null;
  swapMode: SwapMode;
}

export interface GenerateSwapActions {
  onChange: (next: {
    video: SwapUploadedAsset | null;
    reference: SwapUploadedAsset | null;
    swapMode: SwapMode;
  }) => void;
}
