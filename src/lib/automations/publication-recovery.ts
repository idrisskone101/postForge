import {
  isAutomationRecord,
  type AutomationPublication,
  type AutomationRecord,
} from "../automations";
import { AutomationPublicationClaimError } from "./publication-claim-error";

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
