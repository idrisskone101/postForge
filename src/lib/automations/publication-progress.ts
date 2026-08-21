import {
  isAutomationRecord,
  type AutomationPublication,
  type AutomationRecord,
} from "../automations";
import type {
  ProviderPublicationStatus,
  ProviderPublishProgress,
  ProviderShortPublishResult,
} from "../integrations/publishing";

export function completeAutomationPublication(
  records: AutomationRecord[],
  input: {
    automationId: string;
    attemptId: string;
    result: ProviderShortPublishResult;
    now: string;
  }
) {
  let publication: AutomationPublication | null = null;
  const updatedRecords = records.map((candidate) => {
    const publicationForAttempt =
      candidate.id === input.automationId &&
      isAutomationRecord(candidate) &&
      candidate.publication?.attemptId === input.attemptId
        ? candidate.publication
        : null;

    // Some providers emit a final, durable `published` progress event before
    // returning the same result. Treat that exact result as an idempotent
    // completion instead of turning a successful publish into a 500 response.
    if (
      publicationForAttempt?.status === "published" &&
      input.result.status === "published" &&
      publicationForAttempt.externalId === input.result.externalId &&
      publicationForAttempt.providerStatus === input.result.providerStatus &&
      publicationForAttempt.visibility === input.result.visibility &&
      publicationForAttempt.providerVisibility ===
        input.result.providerVisibility
    ) {
      publication = publicationForAttempt;
      return candidate;
    }

    if (
      !publicationForAttempt ||
      (publicationForAttempt.status !== "pending" &&
        publicationForAttempt.status !== "submitted")
    ) {
      return candidate;
    }
    publication = {
      ...publicationForAttempt,
      status: input.result.status,
      updatedAt: input.now,
      externalId: input.result.externalId,
      providerStatus: input.result.providerStatus,
      visibility: input.result.visibility,
      providerVisibility: input.result.providerVisibility,
      providerDataRefreshedAt:
        publicationForAttempt.provider === "youtube"
          ? input.now
          : publicationForAttempt.providerDataRefreshedAt,
      error: null,
      recoveryLeaseId: null,
      recoveryClaimedAt: null,
    };
    return { ...candidate, publication, updatedAt: input.now };
  });
  return {
    records: updatedRecords,
    publication: publication as AutomationPublication | null,
  };
}

export function recordAutomationPublicationProgress(
  records: AutomationRecord[],
  input: {
    automationId: string;
    attemptId: string;
    progress: ProviderPublishProgress;
    now: string;
  }
) {
  let publication: AutomationPublication | null = null;
  const updatedRecords = records.map((candidate) => {
    if (
      candidate.id !== input.automationId ||
      !isAutomationRecord(candidate) ||
      candidate.publication?.attemptId !== input.attemptId ||
      candidate.publication.status === "failed" ||
      candidate.publication.status === "published"
    ) {
      return candidate;
    }
    publication = {
      ...candidate.publication,
      status: input.progress.status,
      updatedAt: input.now,
      externalId:
        input.progress.externalId ?? candidate.publication.externalId,
      providerStatus: input.progress.providerStatus,
      visibility: input.progress.visibility,
      providerVisibility: input.progress.providerVisibility,
      providerDataRefreshedAt:
        candidate.publication.provider === "youtube" &&
        !input.progress.providerStatus.endsWith("REQUEST_SENT") &&
        !input.progress.providerStatus.endsWith("OUTCOME_UNKNOWN")
          ? input.now
          : candidate.publication.providerDataRefreshedAt,
      error: null,
    };
    return { ...candidate, publication, updatedAt: input.now };
  });
  return {
    records: updatedRecords,
    publication: publication as AutomationPublication | null,
  };
}

function providerFailureMessage(providerStatus: string) {
  const reason = providerStatus.split(":").at(-1);
  if (reason === "SPAM_RISK_TOO_MANY_POSTS") {
    return "TikTok's daily API post limit was reached. Use the TikTok app or try again later; PostForge will not retry automatically.";
  }
  if (reason === "SPAM_RISK_USER_BANNED_FROM_POSTING") {
    return "TikTok reports that this account is blocked from posting. Resolve the restriction in TikTok; PostForge will not retry automatically.";
  }
  if (reason === "SPAM_RISK_TEXT") {
    return "TikTok rejected the caption as risky or spam. Review the caption before making any explicit retry.";
  }
  if (reason === "SPAM_RISK") {
    return "TikTok rejected this publishing request as risky. Review it in TikTok; PostForge will not retry automatically.";
  }
  if (reason === "PUBLISH_CANCELLED") {
    return "TikTok reports that this transfer was cancelled. PostForge will not retry automatically.";
  }
  return "The provider reported that processing failed; nothing will retry automatically";
}

export function refreshAutomationPublicationStatus(
  records: AutomationRecord[],
  input: {
    automationId: string;
    attemptId: string;
    status: ProviderPublicationStatus;
    now: string;
  }
) {
  let publication: AutomationPublication | null = null;
  const updatedRecords = records.map((candidate) => {
    if (
      candidate.id !== input.automationId ||
      !isAutomationRecord(candidate) ||
      candidate.publication?.attemptId !== input.attemptId ||
      candidate.publication.status !== "submitted"
    ) {
      return candidate;
    }
    publication = {
      ...candidate.publication,
      status:
        input.status.status === "processing"
          ? "submitted"
          : input.status.status,
      providerStatus: input.status.providerStatus,
      visibility: input.status.visibility ?? candidate.publication.visibility,
      providerVisibility:
        input.status.providerVisibility ??
        candidate.publication.providerVisibility,
      providerDataRefreshedAt:
        candidate.publication.provider === "youtube"
          ? input.now
          : candidate.publication.providerDataRefreshedAt,
      updatedAt: input.now,
      error:
        input.status.status === "failed"
          ? providerFailureMessage(input.status.providerStatus)
          : null,
      recoveryLeaseId: null,
      recoveryClaimedAt: null,
    };
    return { ...candidate, publication, updatedAt: input.now };
  });
  return {
    records: updatedRecords,
    publication: publication as AutomationPublication | null,
  };
}

export function failAutomationPublication(
  records: AutomationRecord[],
  input: {
    automationId: string;
    attemptId: string;
    error: string;
    now: string;
    keepSubmitted?: boolean;
  }
) {
  let publication: AutomationPublication | null = null;
  const safeError = input.error.replace(/\s+/g, " ").trim().slice(0, 300);
  const updatedRecords = records.map((candidate) => {
    if (
      candidate.id !== input.automationId ||
      !isAutomationRecord(candidate) ||
      candidate.publication?.attemptId !== input.attemptId ||
      candidate.publication.status === "published" ||
      candidate.publication.status === "failed"
    ) {
      return candidate;
    }
    publication = {
      ...candidate.publication,
      status:
        input.keepSubmitted ? "submitted" : "failed",
      updatedAt: input.now,
      error: safeError || "Provider publishing failed",
      recoveryLeaseId: null,
      recoveryClaimedAt: null,
    };
    return { ...candidate, publication, updatedAt: input.now };
  });
  return {
    records: updatedRecords,
    publication: publication as AutomationPublication | null,
  };
}
