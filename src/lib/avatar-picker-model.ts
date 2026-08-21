import type {
  AvatarIdentityPackSummary,
  AvatarOrigin,
} from "@/lib/avatar-workflow";

export type Avatar = {
  id: string;
  name: string;
  createdAt: string;
  origin?: AvatarOrigin;
  identityPack?: AvatarIdentityPackSummary | null;
};

export type AvatarListPage = {
  items: Avatar[];
  nextCursor: string | null;
};

export type AvatarGalleryFile = {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export type AvatarJobResult = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
  outputs: {
    id: string;
    type: string;
    mimeType: string;
    width: number | null;
    height: number | null;
  }[];
};

export type AvatarPickerMode = "grid" | "generate" | "gallery" | "import";

export type AvatarCreatedHandoff = {
  onCreated: (avatar: Avatar) => void;
  onBack: () => void;
};
