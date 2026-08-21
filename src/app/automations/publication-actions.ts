import type { AutomationRecord } from "@/lib/automations";

const RECONCILIATION_STAGES = new Set([
  "INITIALIZED",
  "CONTAINER_CREATED",
  "READY_TO_PUBLISH",
  "UPLOAD_SESSION_CREATED",
  "UPLOADED_PROCESSING",
  "PROCESSING_UPLOAD",
  "PROCESSING_DOWNLOAD",
  "SEND_TO_USER_INBOX",
]);

export type PublicationActionState = {
  pendingRecoverable: boolean;
  canRefreshPublication: boolean;
  failedReconciliationStage: boolean;
  manualOutcomeStage: boolean;
  manualOutcomeResolvable: boolean;
  negativeOutcomeResolvable: boolean;
};

export function publicationActionState(
  record: AutomationRecord,
  now = Date.now()
): PublicationActionState {
  const pendingRecoverable =
    record.publication?.status === "pending" &&
    now - new Date(record.publication.requestedAt).getTime() >= 300_000;
  const canRefreshPublication =
    record.publication?.status === "submitted" &&
    Boolean(record.publication.accountId) &&
    (record.publication.provider === "youtube" ||
      Boolean(record.publication.externalId)) &&
    record.publication.providerStatus !== "PUBLISH_REQUEST_SENT" &&
    record.publication.providerStatus !== "PUBLISH_OUTCOME_UNKNOWN";
  const publicationAgeMs =
    now - new Date(record.publication?.requestedAt ?? 0).getTime();
  const explicitUnknownStage =
    (record.publication?.status === "submitted" ||
      (record.publication?.status === "failed" &&
        record.publication.providerStatus ===
          "LOCAL_RETENTION_OUTCOME_UNKNOWN")) &&
    record.publication.providerStatus?.endsWith("OUTCOME_UNKNOWN");
  const requestBoundaryStage =
    record.publication?.status === "submitted" &&
    (record.publication.providerStatus === "INIT_REQUEST_SENT" ||
      record.publication.providerStatus === "PUBLISH_REQUEST_SENT" ||
      record.publication.providerStatus === "UPLOAD_REQUEST_SENT");
  const failedReconciliationStage =
    record.publication?.status === "submitted" &&
    Boolean(record.publication.error) &&
    (RECONCILIATION_STAGES.has(record.publication.providerStatus ?? "") ||
      record.publication.providerStatus?.includes("PROCESSING") === true);
  const manualOutcomeStage =
    Boolean(explicitUnknownStage) ||
    Boolean(requestBoundaryStage) ||
    Boolean(failedReconciliationStage);
  const providerSettlingWindowMs =
    record.publication?.provider === "tiktok"
      ? 6 * 60 * 60 * 1000
      : 60 * 60 * 1000;
  const manualOutcomeResolvable =
    manualOutcomeStage &&
    (explicitUnknownStage ||
      (requestBoundaryStage && publicationAgeMs >= 1_800_000) ||
      (failedReconciliationStage && publicationAgeMs >= providerSettlingWindowMs));
  const negativeOutcomeResolvable =
    manualOutcomeStage && publicationAgeMs >= providerSettlingWindowMs;
  return {
    pendingRecoverable,
    canRefreshPublication,
    failedReconciliationStage: Boolean(failedReconciliationStage),
    manualOutcomeStage,
    manualOutcomeResolvable: Boolean(manualOutcomeResolvable),
    negativeOutcomeResolvable: Boolean(negativeOutcomeResolvable),
  };
}
