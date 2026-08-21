import type { ProviderOAuthConfig } from "./config";
import { IntegrationProviderError } from "./providers/http";
import type { ProviderFetch } from "./providers/types";
import type {
  IntegrationAccount,
  IntegrationProvider,
} from "./types";

const MEBIBYTE = 1024 * 1024;
// Provider limits are much larger, but the current Node executor materializes a
// full upload for YouTube. Keep the product limit honest and bounded before any
// read rather than advertising provider maxima this runtime cannot safely hold.
export const MAX_SOCIAL_PUBLISH_MEDIA_BYTES = 128 * MEBIBYTE;

export type ShortPublishMedia = {
  id: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  bytes: Buffer;
  publicUrl?: string;
  /** Server-resolved path used only for pre-publication media inspection. */
  localPath?: string;
};

export type ProviderShortPublishResult = {
  status: "submitted" | "published";
  externalId: string;
  providerStatus: string;
  visibility: ProviderVisibility;
  /** The provider's exact privacy value, when the provider returned one. */
  providerVisibility: string | null;
};

export type ProviderPublishProgress = {
  status: "submitted" | "published";
  externalId: string | null;
  providerStatus: string;
  visibility: ProviderVisibility;
  providerVisibility: string | null;
};

export type ProviderVisibility =
  | "private"
  | "followers"
  | "friends"
  | "unlisted"
  | "public";

export const TIKTOK_PRIVACY_LEVELS = [
  "PUBLIC_TO_EVERYONE",
  "FOLLOWER_OF_CREATOR",
  "MUTUAL_FOLLOW_FRIENDS",
  "SELF_ONLY",
] as const;

export type TikTokPrivacyLevel = (typeof TIKTOK_PRIVACY_LEVELS)[number];

export type TikTokCreatorPublishingInfo = {
  creatorUsername: string;
  creatorNickname: string;
  privacyLevelOptions: TikTokPrivacyLevel[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maximumVideoDurationSec: number;
};

export type TikTokPublishSettings = {
  privacyLevel: TikTokPrivacyLevel;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
};

export type TikTokPublishStatus = {
  status: "processing" | "published" | "failed";
  providerStatus: string;
};

export type ProviderPublicationStatus = {
  status: "processing" | "published" | "failed";
  providerStatus: string;
  visibility?: ProviderVisibility;
  providerVisibility?: string | null;
};

export type YouTubePublishSettings = {
  title: string;
  description: string;
  privacyStatus: "private" | "unlisted" | "public";
  selfDeclaredMadeForKids: boolean;
  audienceConfirmed: boolean;
  communityGuidelinesConfirmed: boolean;
};

export type ProviderShortPublishRequest = {
  provider: IntegrationProvider;
  config: ProviderOAuthConfig;
  accessToken: string;
  account: IntegrationAccount;
  media: ShortPublishMedia;
  caption: string;
  tiktokSettings?: TikTokPublishSettings;
  youtubeSettings?: YouTubePublishSettings;
};

export type ProviderPublishingDependencies = {
  fetch?: ProviderFetch;
  wait?: (milliseconds: number) => Promise<void>;
  onProgress?: (progress: ProviderPublishProgress) => Promise<void>;
  onRecoverySession?: (uploadUrl: string) => Promise<void>;
  inspectInstagramMedia?: (localPath: string) => Promise<void>;
};

export class IntegrationMediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationMediaValidationError";
  }
}

export class IntegrationPublicationTerminalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationPublicationTerminalError";
  }
}

export class IntegrationPublicationAmbiguousError extends Error {
  readonly authorizationFailure: boolean;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "IntegrationPublicationAmbiguousError";
    this.authorizationFailure =
      cause instanceof IntegrationProviderError &&
      cause.kind === "authorization";
  }
}
