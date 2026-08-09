export interface ModelPricing {
  unit: "per_image" | "per_second" | "per_clip";
  amount: number;
}

export interface ModelCapabilities {
  textToImage?: boolean;
  imageToImage?: boolean;
  textToVideo?: boolean;
  imageToVideo?: boolean;
  /** Accepts a generated video's first frame as a seed for character continuity */
  videoToVideo?: boolean;
  subjectSwap?: boolean;
  keepOriginalAudio?: boolean;
  multiShot?: boolean;
  nativeAudio?: boolean;
  referenceImages?: boolean;
  maxReferenceImages?: number;
  webSearch?: boolean;
  motionControl?: boolean;
  /** Provider-specific strategy for binding a saved character to generated video. */
  characterReference?: "kling-element" | "seedance-images" | "gemini-images";
}

export interface ModelDefaults {
  aspectRatio: string;
  duration?: number;
  numImages?: number;
}

export interface ModelLimits {
  minDuration?: number;
  maxDuration?: number;
  maxImages?: number;
  aspectRatios: string[];
}

export interface ModelDefinition {
  id: string;
  name: string;
  type: "image" | "video";
  provider: "fal";
  endpoint: string;
  pricing: ModelPricing;
  audioMultiplier?: number;
  capabilities: ModelCapabilities;
  defaults: ModelDefaults;
  limits: ModelLimits;
}

export interface ImageGenerationRequest {
  prompt: string;
  model: string;
  aspectRatio?: string;
  numImages?: number;
  negativePrompt?: string;
  imageUrls?: string[];
  editEndpoint?: boolean;
  enableWebSearch?: boolean;
  thinkingLevel?: "minimal" | "high";
}

export interface VideoGenerationRequest {
  prompt: string;
  model: string;
  duration?: number;
  aspectRatio?: string;
  inputImageUrl?: string;
  enableAudio?: boolean;
  multiShot?: {
    shots: {
      prompt: string;
      duration: number;
      cameraMovement?: string;
    }[];
  };
}

export type SwapMode = "person" | "object" | "background";

export interface VideoSwapGenerationRequest {
  prompt: string;
  model: string;
  videoUrl: string;
  referenceImageUrl?: string;
  swapMode?: SwapMode;
  keyframeId?: number;
  resolution?: "360p" | "540p" | "720p";
  keepOriginalSound?: boolean;
}

export interface GeneratedImage {
  url: string;
  localPath?: string;
  width: number;
  height: number;
  contentType: string;
}

export interface GeneratedVideo {
  url: string;
  localPath?: string;
  width: number;
  height: number;
  durationSeconds: number;
  contentType: string;
  hasAudio: boolean;
}
