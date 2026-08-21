export type Phase = "input" | "reviewing" | "submitted";
export type CloneSetupStep = "source" | "identity" | "reference";

export interface RefJobStatus {
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
  estimatedCost: number;
  outputs: { id: string }[];
}

export interface RefImageEntry {
  jobId: string;
  fileId: string | null;
  prompt: string;
  cost: number;
  status: "generating" | "completed" | "failed";
  error?: string;
}

export interface SavedReference {
  id: string;
  avatarId: string;
  prompt: string;
  createdAt: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  previewUrl: string;
  source: {
    id: string;
    label: string;
    originalUrl: string;
  } | null;
}

export type SavedReferenceListPage = {
  items: SavedReference[];
  nextCursor: string | null;
};

export interface AvatarIdentityPack {
  id: string;
  avatarId: string;
  status: "queued" | "processing" | "completed" | "failed";
  imageModel: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  backfillingHairstyles?: boolean;
  missingHairstyleRoles?: string[];
  images: {
    id: string;
    role: string;
    kind?: "core" | "hairstyle";
    previewUrl: string;
  }[];
}

export type AvatarReferencePreview = {
  id: string;
  label: string;
  detail: string;
  previewUrl: string;
};
