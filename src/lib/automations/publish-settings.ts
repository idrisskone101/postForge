import type { AutomationRecord } from "@/lib/automations";
import {
  TIKTOK_PRIVACY_LEVELS,
  type TikTokPrivacyLevel,
  type TikTokPublishSettings,
  type YouTubePublishSettings,
} from "@/lib/integrations/publishing";
import {
  isWellFormedUnicode,
  truncateUtf16Units,
  unicodeCodePointLength,
} from "@/lib/unicode";

export type PublishBody = {
  action?: unknown;
  assetId?: unknown;
  caption?: unknown;
  consent?: unknown;
  musicUsageConfirmed?: unknown;
  brandedPolicyConfirmed?: unknown;
  retryFailed?: unknown;
  resolution?: unknown;
  tiktok?: unknown;
  youtube?: unknown;
};

export function safeCaption(automation: AutomationRecord) {
  return truncateUtf16Units(
    [automation.hook.selected.trim(), automation.cta.prompt.trim()]
      .filter(Boolean)
      .join("\n\n"),
    2200
  );
}

export function validateTikTokSettings(value: unknown): TikTokPublishSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const settings = value as Record<string, unknown>;
  if (
    typeof settings.privacyLevel !== "string" ||
    !(TIKTOK_PRIVACY_LEVELS as readonly string[]).includes(
      settings.privacyLevel
    ) ||
    typeof settings.allowComment !== "boolean" ||
    typeof settings.allowDuet !== "boolean" ||
    typeof settings.allowStitch !== "boolean" ||
    typeof settings.brandContent !== "boolean" ||
    typeof settings.brandOrganic !== "boolean"
  ) {
    return null;
  }
  return {
    privacyLevel: settings.privacyLevel as TikTokPrivacyLevel,
    allowComment: settings.allowComment,
    allowDuet: settings.allowDuet,
    allowStitch: settings.allowStitch,
    brandContent: settings.brandContent,
    brandOrganic: settings.brandOrganic,
  };
}

export function validateYouTubeSettings(
  value: unknown
): YouTubePublishSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const settings = value as Record<string, unknown>;
  if (
    typeof settings.title !== "string" ||
    !settings.title.trim() ||
    !isWellFormedUnicode(settings.title) ||
    unicodeCodePointLength(settings.title) > 100 ||
    /[<>]/.test(settings.title) ||
    typeof settings.description !== "string" ||
    !isWellFormedUnicode(settings.description) ||
    Buffer.byteLength(settings.description, "utf8") > 5000 ||
    /[<>]/.test(settings.description) ||
    typeof settings.selfDeclaredMadeForKids !== "boolean" ||
    settings.audienceConfirmed !== true ||
    settings.communityGuidelinesConfirmed !== true ||
    (settings.privacyStatus !== "private" &&
      settings.privacyStatus !== "unlisted" &&
      settings.privacyStatus !== "public")
  ) {
    return null;
  }
  return {
    title: settings.title,
    description: settings.description,
    privacyStatus: settings.privacyStatus,
    selfDeclaredMadeForKids: settings.selfDeclaredMadeForKids,
    audienceConfirmed: true,
    communityGuidelinesConfirmed: true,
  };
}
