export interface ModelPricing {
  unit: "per_image" | "per_second";
  amount: number;
}

export interface ModelCapabilities {
  textToImage?: boolean;
  imageToImage?: boolean;
  textToVideo?: boolean;
  imageToVideo?: boolean;
  multiShot?: boolean;
  nativeAudio?: boolean;
  referenceImages?: boolean;
  maxReferenceImages?: number;
  webSearch?: boolean;
  motionControl?: boolean;
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
  referenceImageUrls?: string[];
  imageUrls?: string[];
  editEndpoint?: boolean;
  enableWebSearch?: boolean;
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
