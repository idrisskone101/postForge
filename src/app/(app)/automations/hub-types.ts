import type { AutomationRecord } from "@/lib/automations";
import type {
  TikTokCreatorPublishingInfo,
  TikTokPrivacyLevel,
} from "@/lib/integrations/publishing";

export type PublishPreflight = {
  provider: "tiktok" | "instagram" | "youtube";
  account: {
    id: string;
    username: string | null;
    displayName: string | null;
  };
  asset: {
    id: string;
    filename: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    durationSec: number | null;
    previewUrl: string;
  };
  caption: string;
  youtube: { title: string; description: string } | null;
  visibility: "private" | "public";
  creator: TikTokCreatorPublishingInfo | null;
  tiktokDirectPostApprovalAcknowledged: boolean;
};

export type PublishDialogState = {
  recordId: string;
  recordName: string;
  retryFailed: boolean;
  preflight: PublishPreflight;
  caption: string;
  tiktokPrivacy: "" | TikTokPrivacyLevel;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  commercial: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
  musicUsageConfirmed: boolean;
  brandedPolicyConfirmed: boolean;
  youtubeTitle: string;
  youtubeDescription: string;
  youtubePrivacy: "" | "private" | "unlisted" | "public";
  youtubeAudience: "" | "made_for_kids" | "not_made_for_kids";
  youtubeGuidelinesConfirmed: boolean;
  consent: boolean;
  error: string | null;
};

export type ManualResolutionDialogState = {
  record: AutomationRecord;
  resolution: "published" | "not_published";
  error: string | null;
};

export type VideoAutomationMenuModel = {
  record: AutomationRecord;
  scheduleActive: boolean;
  canControlLocalSchedule: boolean;
  pendingRecoverable: boolean;
  canRefreshPublication: boolean;
  failedReconciliationStage: boolean;
  manualOutcomeStage: boolean;
  manualOutcomeResolvable: boolean;
  negativeOutcomeResolvable: boolean;
  onChangeLocalSchedule: () => void;
  onGenerateReviewDraft: () => void;
  onOpenPublishReview: () => void;
  onRefreshPublication: () => void;
  onRecoverPendingPublication: () => void;
  onSetManualResolutionDialog: (state: ManualResolutionDialogState) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};
