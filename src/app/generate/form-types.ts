import type { ReactNode } from "react";
import type { ModelDefinition } from "@/lib/ai/types";

export interface GenerationFormProps {
  models: ModelDefinition[];
}

export interface GenerateFormViewProps {
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
  avatarSection?: ReactNode;
  referenceSection?: ReactNode;
  continuitySection?: ReactNode;
  swapSection?: ReactNode;
  swapReady?: boolean;
  swapSourceDurationSec?: number;
  avatarName?: string | null;
  /** When set, generation is blocked until the vibe JSON requirement is met. */
  vibeRequirement?: string | null;
}
