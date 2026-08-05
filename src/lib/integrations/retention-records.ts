import {
  isAutomationRecord,
  type AutomationPublication,
  type AutomationRecord,
} from "../automations";

export const YOUTUBE_API_DATA_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const YOUTUBE_API_DATA_REFRESH_LEAD_MS = 24 * 60 * 60 * 1000;
export const YOUTUBE_RETENTION_UNKNOWN_STATUS =
  "LOCAL_RETENTION_OUTCOME_UNKNOWN";

export function youtubeApiDataIsFresh(value: string | null, now: Date) {
  if (!value) return false;
  const valueMs = new Date(value).getTime();
  const age = now.getTime() - valueMs;
  return (
    Number.isFinite(valueMs) &&
    Number.isFinite(age) &&
    age >= 0 &&
    age < YOUTUBE_API_DATA_MAX_AGE_MS
  );
}

export function youtubeApiDataRefreshIsDue(
  value: string | null,
  now: Date
) {
  if (!value) return true;
  const valueMs = new Date(value).getTime();
  const age = now.getTime() - valueMs;
  return (
    !Number.isFinite(valueMs) ||
    !Number.isFinite(age) ||
    age < 0 ||
    age >=
      YOUTUBE_API_DATA_MAX_AGE_MS - YOUTUBE_API_DATA_REFRESH_LEAD_MS
  );
}

function scrubPublicationProviderData(
  publication: AutomationPublication,
  now: string
): AutomationPublication {
  const outcomeWasUnresolved =
    publication.status === "pending" || publication.status === "submitted";
  return {
    ...publication,
    accountId: null,
    status: outcomeWasUnresolved ? "failed" : publication.status,
    updatedAt: now,
    externalId: null,
    providerStatus: outcomeWasUnresolved
      ? YOUTUBE_RETENTION_UNKNOWN_STATUS
      : null,
    providerVisibility: null,
    providerDataRefreshedAt: null,
    error: outcomeWasUnresolved
      ? "YouTube did not reverify this outcome before its provider data expired. Check YouTube and resolve the outcome before any new publish attempt."
      : publication.status === "failed"
        ? "YouTube provider error details expired and were deleted."
        : null,
    recoveryLeaseId: null,
    recoveryClaimedAt: null,
  };
}

export function expireYouTubeUploadRecoverySessions(
  records: AutomationRecord[],
  input: { now: Date; attemptIds: ReadonlySet<string> }
) {
  const now = input.now.toISOString();
  let changed = 0;
  const recordsAfterExpiry = records.map((candidate) => {
    if (!isAutomationRecord(candidate)) return candidate;
    const publication = candidate.publication;
    if (
      publication?.provider !== "youtube" ||
      !input.attemptIds.has(publication.attemptId) ||
      (publication.status !== "pending" &&
        publication.status !== "submitted")
    ) {
      return candidate;
    }
    changed += 1;
    return {
      ...candidate,
      publication: scrubPublicationProviderData(publication, now),
      updatedAt: now,
    };
  });
  return { records: recordsAfterExpiry, changed };
}

export function scrubYouTubeAutomationProviderData(
  records: AutomationRecord[],
  input: {
    now: Date;
    scrubAccountBindings: boolean;
    activeAccount?: {
      id: string;
      username: string | null;
      displayName: string | null;
    } | null;
    /** Scrub only bindings to this specific account id (per-account disconnect). */
    disconnectedAccountId?: string | null;
  }
) {
  const now = input.now.toISOString();
  let changed = 0;
  const updatedRecords = records.map((candidate) => {
    if (!isAutomationRecord(candidate)) return candidate;

    const providerWideScrub =
      input.scrubAccountBindings && !input.disconnectedAccountId;

    let accountId = candidate.accountId;
    let accountLabel = candidate.accountLabel;
    let status = candidate.status;
    let publication = candidate.publication;
    let didChange = false;

    if (candidate.destination === "youtube") {
      const boundToDisconnectedAccount =
        input.disconnectedAccountId &&
        accountId === input.disconnectedAccountId;
      if (providerWideScrub || boundToDisconnectedAccount) {
        if (accountId !== null || accountLabel !== null) didChange = true;
        accountId = null;
        accountLabel = null;
        if (status !== "needs_connection") {
          status = "needs_connection";
          didChange = true;
        }
      } else if (input.activeAccount && accountId) {
        if (accountId !== input.activeAccount.id) {
          accountId = null;
          accountLabel = null;
          status = "needs_connection";
          didChange = true;
        } else {
          const refreshedLabel =
            input.activeAccount.displayName?.trim() ||
            input.activeAccount.username?.trim() ||
            "YouTube account";
          if (accountLabel !== refreshedLabel) {
            accountLabel = refreshedLabel;
            didChange = true;
          }
        }
      }
    }

    if (
      publication?.provider === "youtube" &&
      (providerWideScrub ||
        (input.disconnectedAccountId &&
          publication.accountId === input.disconnectedAccountId) ||
        !youtubeApiDataIsFresh(
          publication.providerDataRefreshedAt ?? publication.requestedAt,
          input.now
        ))
    ) {
      publication = scrubPublicationProviderData(publication, now);
      didChange = true;
    }

    if (!didChange) return candidate;
    changed += 1;
    return {
      ...candidate,
      accountId,
      accountLabel,
      status,
      publication,
      updatedAt: now,
    };
  });

  return { records: updatedRecords, changed };
}
