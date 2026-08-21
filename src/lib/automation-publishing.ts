import { createHash } from "node:crypto";
import {
  isAutomationRecord,
  isAutomationSocialDestination,
  publicationIsUnresolved,
  type AutomationPublication,
  type AutomationRecord,
  type AutomationSocialDestination,
} from "./automations";
import { AutomationPublicationClaimError } from "./automations/publication-claim-error";

export { AutomationPublicationClaimError };
export {
  completeAutomationPublication,
  failAutomationPublication,
  recordAutomationPublicationProgress,
  refreshAutomationPublicationStatus,
} from "./automations/publication-progress";
export {
  claimAutomationPublicationRecovery,
  manuallyResolveUnknownPublication,
  recoverStalePendingPublication,
  releaseAutomationPublicationRecovery,
} from "./automations/publication-recovery";

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
