import { createHash } from "node:crypto";
import {
  isAutomationRecord,
  isAutomationSocialDestination,
  publicationIsUnresolved,
  type AutomationPublication,
  type AutomationRecord,
  type AutomationSocialDestination,
} from "./automations";
import type {
  ProviderPublicationStatus,
  ProviderPublishProgress,
  ProviderShortPublishResult,
} from "./integrations/publishing";

export class AutomationPublicationClaimError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AutomationPublicationClaimError";
    this.statusCode = statusCode;
  }
}

export function publicationProgressMayHaveCrossedPostBoundary(
  providerStatus: string
) {
  return (
    providerStatus === "INITIALIZED" ||
    providerStatus === "PUBLISH_OUTCOME_UNKNOWN" ||
    providerStatus === "UPLOADED_PROCESSING" ||
    providerStatus === "UPLOAD_REQUEST_SENT" ||
    providerStatus === "PUBLISHED" ||
    providerStatus === "PUBLISH_COMPLETE" ||
    providerStatus.endsWith("OUTCOME_UNKNOWN")
  );
}

export function automationPublicationIdempotencyKey(input: {
  automationId: string;
  provider: AutomationSocialDestination;
  accountId: string;
  assetId: string;
}) {
  return createHash("sha256")
    .update(
      [input.automationId, input.provider, input.accountId, input.assetId].join(
        "\u0000"
      )
    )
    .digest("base64url");
}

export function claimAutomationPublication(
  records: AutomationRecord[],
  input: {
    automationId: string;
    provider: AutomationSocialDestination;
    accountId: string;
    assetId: string;
    attemptId: string;
    now: string;
    retryFailed: boolean;
  }
): {
  records: AutomationRecord[];
  publication: AutomationPublication;
  claimed: boolean;
} {
  let publication: AutomationPublication | null = null;
  let claimed = false;
  const idempotencyKey = automationPublicationIdempotencyKey(input);
  const conflictingPublication = records.find((candidate) => {
    if (
      candidate.id === input.automationId ||
      !isAutomationRecord(candidate) ||
      !publicationIsUnresolved(candidate.publication)
    ) {
      return false;
    }
    const existing = candidate.publication!;
    if (
      existing.provider !== input.provider ||
      existing.assetId !== input.assetId
    ) {
      return false;
    }
    if (
      existing.providerStatus === "LOCAL_RETENTION_OUTCOME_UNKNOWN" &&
      !existing.manualResolution
    ) {
      // Retention deliberately removes the provider account id. Until manual
      // resolution, provider + approved asset is the only safe conflict key.
      return true;
    }
    return existing.accountId === input.accountId;
  });
  if (conflictingPublication) {
    throw new AutomationPublicationClaimError(
      "This approved video already has an unresolved publication for this destination account",
      409
    );
  }
  const updatedRecords = records.map((candidate) => {
    if (candidate.id !== input.automationId || !isAutomationRecord(candidate)) {
      return candidate;
    }
    if (
      !isAutomationSocialDestination(candidate.destination) ||
      candidate.destination !== input.provider
    ) {
      throw new AutomationPublicationClaimError(
        "This automation does not have a social publishing destination",
        409
      );
    }
    if (!candidate.approvalRequired) {
      throw new AutomationPublicationClaimError(
        "Social publishing requires approval to remain enabled",
        409
      );
    }
    if (candidate.accountId !== input.accountId) {
      throw new AutomationPublicationClaimError(
        "The automation is not bound to the connected destination account",
        409
      );
    }
    if (candidate.content.sourceFileId !== input.assetId) {
      throw new AutomationPublicationClaimError(
        "The approved Gallery asset changed before publishing; review it again",
        409
      );
    }

    const existing = candidate.publication;
    if (
      existing?.providerStatus === "LOCAL_RETENTION_OUTCOME_UNKNOWN" &&
      !existing.manualResolution
    ) {
      throw new AutomationPublicationClaimError(
        "Verify the expired YouTube outcome and resolve it before creating another publish attempt",
        409
      );
    }
    if (
      existing?.idempotencyKey === idempotencyKey &&
      (existing.status !== "failed" || !input.retryFailed)
    ) {
      publication = existing;
      return candidate;
    }

    publication = {
      attemptId: input.attemptId,
      attemptNumber:
        existing?.idempotencyKey === idempotencyKey
          ? existing.attemptNumber + 1
          : 1,
      idempotencyKey,
      provider: input.provider,
      assetId: input.assetId,
      accountId: input.accountId,
      status: "pending",
      requestedAt: input.now,
      updatedAt: input.now,
      externalId: null,
      providerStatus: null,
      visibility: null,
      providerVisibility: null,
      providerDataRefreshedAt: null,
      error: null,
      recoveryLeaseId: null,
      recoveryClaimedAt: null,
      manualResolution: null,
      manuallyResolvedAt: null,
    };
    claimed = true;
    return { ...candidate, publication, updatedAt: input.now };
  });

  if (!publication) {
    throw new AutomationPublicationClaimError(
      "Automation was not found",
      404
    );
  }
  return { records: updatedRecords, publication, claimed };
}

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

export function claimAutomationPublicationRecovery(
  records: AutomationRecord[],
  input: {
    automationId: string;
    attemptId: string;
    leaseId: string;
    now: string;
    leaseDurationMs?: number;
  }
) {
  let publication: AutomationPublication | null = null;
  let claimed = false;
  const nowMs = new Date(input.now).getTime();
  // Provider requests are individually time-bounded, but Instagram can poll
  // for several minutes. Thirty minutes exceeds the complete bounded recovery
  // path and prevents a second request from stealing a live lease.
  const leaseDurationMs = input.leaseDurationMs ?? 1_800_000;
  const updatedRecords = records.map((candidate) => {
    if (
      candidate.id !== input.automationId ||
      !isAutomationRecord(candidate) ||
      candidate.publication?.attemptId !== input.attemptId ||
      candidate.publication.status !== "submitted"
    ) {
      return candidate;
    }
    const claimedAt = candidate.publication.recoveryClaimedAt
      ? new Date(candidate.publication.recoveryClaimedAt).getTime()
      : Number.NaN;
    if (
      candidate.publication.recoveryLeaseId &&
      Number.isFinite(claimedAt) &&
      nowMs - claimedAt < leaseDurationMs
    ) {
      publication = candidate.publication;
      return candidate;
    }
    publication = {
      ...candidate.publication,
      recoveryLeaseId: input.leaseId,
      recoveryClaimedAt: input.now,
    };
    claimed = true;
    return { ...candidate, publication, updatedAt: input.now };
  });
  if (!publication) {
    throw new AutomationPublicationClaimError(
      "This publication is not available for provider recovery",
      409
    );
  }
  return { records: updatedRecords, publication, claimed };
}

export function releaseAutomationPublicationRecovery(
  records: AutomationRecord[],
  input: {
    automationId: string;
    attemptId: string;
    leaseId: string;
    now: string;
  }
) {
  let publication: AutomationPublication | null = null;
  const updatedRecords = records.map((candidate) => {
    if (
      candidate.id !== input.automationId ||
      !isAutomationRecord(candidate) ||
      candidate.publication?.attemptId !== input.attemptId ||
      candidate.publication.recoveryLeaseId !== input.leaseId
    ) {
      return candidate;
    }
    publication = {
      ...candidate.publication,
      recoveryLeaseId: null,
      recoveryClaimedAt: null,
      updatedAt: input.now,
    };
    return { ...candidate, publication, updatedAt: input.now };
  });
  return {
    records: updatedRecords,
    publication: publication as AutomationPublication | null,
  };
}

export function recoverStalePendingPublication(
  records: AutomationRecord[],
  input: {
    automationId: string;
    attemptId: string;
    now: string;
    minimumAgeMs?: number;
  }
) {
  let publication: AutomationPublication | null = null;
  const nowMs = new Date(input.now).getTime();
  const minimumAgeMs = input.minimumAgeMs ?? 300_000;
  const updatedRecords = records.map((candidate) => {
    if (
      candidate.id !== input.automationId ||
      !isAutomationRecord(candidate) ||
      candidate.publication?.attemptId !== input.attemptId
    ) {
      return candidate;
    }
    const current = candidate.publication;
    const age = nowMs - new Date(current.requestedAt).getTime();
    if (
      current.status !== "pending" ||
      current.providerStatus !== null ||
      current.externalId !== null ||
      !Number.isFinite(age) ||
      age < minimumAgeMs
    ) {
      throw new AutomationPublicationClaimError(
        "Only a stale pre-provider claim can be recovered safely",
        409
      );
    }
    publication = {
      ...current,
      status: "failed",
      updatedAt: input.now,
      error:
        "The server stopped before contacting the provider. Review and explicitly retry this safe pre-provider attempt.",
      recoveryLeaseId: null,
      recoveryClaimedAt: null,
    };
    return { ...candidate, publication, updatedAt: input.now };
  });
  if (!publication) {
    throw new AutomationPublicationClaimError("Automation was not found", 404);
  }
  return {
    records: updatedRecords,
    publication: publication as AutomationPublication,
  };
}

export function manuallyResolveUnknownPublication(
  records: AutomationRecord[],
  input: {
    automationId: string;
    attemptId: string;
    resolution: "published" | "not_published";
    now: string;
    minimumRequestAgeMs?: number;
  }
) {
  let publication: AutomationPublication | null = null;
  const nowMs = new Date(input.now).getTime();
  const unknownStages = new Set([
    "INIT_REQUEST_SENT",
    "INIT_OUTCOME_UNKNOWN",
    "PUBLISH_REQUEST_SENT",
    "PUBLISH_OUTCOME_UNKNOWN",
    "UPLOAD_REQUEST_SENT",
    "UPLOAD_OUTCOME_UNKNOWN",
    "LOCAL_RETENTION_OUTCOME_UNKNOWN",
  ]);
  const reconciliationStages = new Set([
    "INITIALIZED",
    "CONTAINER_CREATED",
    "READY_TO_PUBLISH",
    "UPLOAD_SESSION_CREATED",
    "UPLOADED_PROCESSING",
    "PROCESSING_UPLOAD",
    "PROCESSING_DOWNLOAD",
    "SEND_TO_USER_INBOX",
  ]);
  const updatedRecords = records.map((candidate) => {
    if (
      candidate.id !== input.automationId ||
      !isAutomationRecord(candidate) ||
      candidate.publication?.attemptId !== input.attemptId
    ) {
      return candidate;
    }
    const current = candidate.publication;
    const age = nowMs - new Date(current.requestedAt).getTime();
    const explicitUnknown = current.providerStatus?.endsWith("OUTCOME_UNKNOWN");
    const requestBoundary = current.providerStatus?.endsWith("REQUEST_SENT");
    const failedReconciliation =
      Boolean(current.error?.trim()) &&
      (reconciliationStages.has(current.providerStatus ?? "") ||
        current.providerStatus?.includes("PROCESSING") === true);
    const minimumRequestAgeMs =
      input.minimumRequestAgeMs ??
      (current.provider === "tiktok" ? 6 * 60 * 60 * 1000 : 60 * 60 * 1000);
    const retentionOutcomeNeedsResolution =
      current.status === "failed" &&
      current.providerStatus === "LOCAL_RETENTION_OUTCOME_UNKNOWN";
    if (
      (current.status !== "submitted" && !retentionOutcomeNeedsResolution) ||
      !current.providerStatus ||
      (!unknownStages.has(current.providerStatus) && !failedReconciliation) ||
      (input.resolution === "published"
        ? !explicitUnknown &&
          (!Number.isFinite(age) ||
            age < (requestBoundary ? 1_800_000 : minimumRequestAgeMs))
        : !Number.isFinite(age) || age < minimumRequestAgeMs)
    ) {
      throw new AutomationPublicationClaimError(
        "This publication is not eligible for manual outcome resolution yet",
        409
      );
    }
    publication = {
      ...current,
      status: input.resolution === "published" ? "published" : "failed",
      providerStatus:
        input.resolution === "published"
          ? "MANUALLY_CONFIRMED_PUBLISHED"
          : "MANUALLY_CONFIRMED_NOT_PUBLISHED",
      updatedAt: input.now,
      error:
        input.resolution === "published"
          ? null
          : "User verified that the provider did not publish this attempt; explicit retry is now available.",
      recoveryLeaseId: null,
      recoveryClaimedAt: null,
      manualResolution: input.resolution,
      manuallyResolvedAt: input.now,
    };
    return { ...candidate, publication, updatedAt: input.now };
  });
  if (!publication) {
    throw new AutomationPublicationClaimError("Automation was not found", 404);
  }
  return {
    records: updatedRecords,
    publication: publication as AutomationPublication,
  };
}
