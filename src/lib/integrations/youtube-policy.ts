import { YouTubePolicyConsentRequiredError } from "./errors";
import { youtubeApiDataIsFresh } from "./retention-records";
import type { YouTubeComplianceUrls } from "./config";
import type { StoredOAuthStateRecord } from "./store";
import type {
  DecryptedIntegrationConnection,
  IntegrationProvider,
  PublicYouTubeCompliance,
  YouTubePolicyAcceptance,
} from "./types";

export const YOUTUBE_TERMS_OF_SERVICE_URL =
  "https://www.youtube.com/t/terms" as const;

export function youtubeProviderDataIsFresh(syncedAt: string, now: Date) {
  return youtubeApiDataIsFresh(syncedAt, now);
}

export function youtubePolicyAcceptanceMatches(
  acceptance: YouTubePolicyAcceptance | null | undefined,
  complianceUrls: YouTubeComplianceUrls | null
) {
  if (!acceptance || !complianceUrls) return false;
  return (
    acceptance.version === 1 &&
    Number.isFinite(new Date(acceptance.acceptedAt).getTime()) &&
    acceptance.privacyPolicyUrl === complianceUrls.privacyPolicy &&
    acceptance.termsUrl === complianceUrls.terms &&
    acceptance.dataDeletionUrl === complianceUrls.dataDeletion &&
    acceptance.youtubeTermsOfServiceUrl === YOUTUBE_TERMS_OF_SERVICE_URL
  );
}

export function youtubeConsentStateIsCurrent(
  record: StoredOAuthStateRecord | undefined,
  complianceUrls: YouTubeComplianceUrls | null,
  now: Date
) {
  if (
    !record ||
    record.version !== 1 ||
    record.provider !== "youtube" ||
    !youtubePolicyAcceptanceMatches(
      record.youtubePolicyAcceptance,
      complianceUrls
    )
  ) {
    return false;
  }
  const expiresAt = new Date(record.expiresAt).getTime();
  const acceptedAt = new Date(
    record.youtubePolicyAcceptance!.acceptedAt
  ).getTime();
  return (
    Number.isFinite(expiresAt) &&
    expiresAt >= now.getTime() &&
    acceptedAt <= expiresAt
  );
}

export function youtubeComplianceStatus(
  provider: IntegrationProvider,
  complianceUrls: YouTubeComplianceUrls | null,
  connection: DecryptedIntegrationConnection | null
): PublicYouTubeCompliance | null {
  if (provider !== "youtube" || !complianceUrls) return null;
  const consentAccepted = youtubePolicyAcceptanceMatches(
    connection?.youtubePolicyAcceptance,
    complianceUrls
  );
  return {
    privacyPolicyUrl: complianceUrls.privacyPolicy,
    termsUrl: complianceUrls.terms,
    dataDeletionUrl: complianceUrls.dataDeletion,
    youtubeTermsOfServiceUrl: YOUTUBE_TERMS_OF_SERVICE_URL,
    consentAccepted,
    acceptedAt: consentAccepted
      ? connection?.youtubePolicyAcceptance?.acceptedAt ?? null
      : null,
  };
}

export function assertYouTubePolicyConsent(
  provider: IntegrationProvider,
  connection: DecryptedIntegrationConnection,
  complianceUrls: YouTubeComplianceUrls | null
) {
  if (
    provider === "youtube" &&
    !youtubePolicyAcceptanceMatches(
      connection.youtubePolicyAcceptance,
      complianceUrls
    )
  ) {
    throw new YouTubePolicyConsentRequiredError();
  }
}
