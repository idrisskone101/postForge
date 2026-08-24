import type { AutomationPublication, AutomationRecord } from "@/lib/automations";
import { unicodeCodePointLength } from "@/lib/unicode";
import type { PublishDialogState, PublishPreflight } from "./hub-types";

export function createPublishDialogState(
  record: AutomationRecord,
  preflight: PublishPreflight
): PublishDialogState {
  return {
    recordId: record.id,
    recordName: record.name,
    retryFailed: record.publication?.status === "failed",
    preflight,
    caption: preflight.caption,
    tiktokPrivacy: "",
    allowComment: false,
    allowDuet: false,
    allowStitch: false,
    commercial: false,
    brandContent: false,
    brandOrganic: false,
    musicUsageConfirmed: false,
    brandedPolicyConfirmed: false,
    youtubeTitle: preflight.youtube?.title ?? "",
    youtubeDescription: preflight.youtube?.description ?? "",
    youtubePrivacy: "",
    youtubeAudience: "",
    youtubeGuidelinesConfirmed: false,
    consent: false,
    error: null,
  };
}

export function buildPublishRequestBody(state: PublishDialogState) {
  return {
    action: "publish" as const,
    assetId: state.preflight.asset.id,
    caption: state.caption,
    consent: state.consent,
    retryFailed: state.retryFailed,
    musicUsageConfirmed: state.musicUsageConfirmed,
    brandedPolicyConfirmed: state.brandedPolicyConfirmed,
    tiktok:
      state.preflight.provider === "tiktok"
        ? {
            privacyLevel: state.tiktokPrivacy,
            allowComment: state.allowComment,
            allowDuet: state.allowDuet,
            allowStitch: state.allowStitch,
            brandContent: state.commercial && state.brandContent,
            brandOrganic: state.commercial && state.brandOrganic,
          }
        : undefined,
    youtube:
      state.preflight.provider === "youtube"
        ? {
            title: state.youtubeTitle,
            description: state.youtubeDescription,
            privacyStatus: state.youtubePrivacy,
            selfDeclaredMadeForKids: state.youtubeAudience === "made_for_kids",
            audienceConfirmed: Boolean(state.youtubeAudience),
            communityGuidelinesConfirmed: state.youtubeGuidelinesConfirmed,
          }
        : undefined,
  };
}

export function canSubmitPublishReview(state: PublishDialogState) {
  const descriptionBytes = new TextEncoder().encode(
    state.youtubeDescription
  ).length;
  const tiktokCommercialValid =
    !state.commercial ||
    ((state.brandContent || state.brandOrganic) &&
      (!state.brandContent || state.brandedPolicyConfirmed));
  const tiktokPrivacyValid =
    Boolean(state.tiktokPrivacy) &&
    !(state.brandContent && state.tiktokPrivacy === "SELF_ONLY");
  const youtubeValid =
    Boolean(state.youtubePrivacy) &&
    Boolean(state.youtubeAudience) &&
    state.youtubeGuidelinesConfirmed &&
    Boolean(state.youtubeTitle.trim()) &&
    unicodeCodePointLength(state.youtubeTitle) <= 100 &&
    !/[<>]/.test(state.youtubeTitle) &&
    descriptionBytes <= 5000 &&
    !/[<>]/.test(state.youtubeDescription);

  switch (state.preflight.provider) {
    case "tiktok":
      return (
        state.consent &&
        state.preflight.tiktokDirectPostApprovalAcknowledged &&
        tiktokPrivacyValid &&
        state.musicUsageConfirmed &&
        tiktokCommercialValid
      );
    case "youtube":
      return state.consent && youtubeValid;
    case "instagram":
      return state.consent && state.caption.length <= 2200;
    default: {
      const _exhaustive: never = state.preflight.provider;
      return _exhaustive;
    }
  }
}

export type PublishMutationResponse = {
  error?: string;
  publication?: AutomationPublication | null;
};
