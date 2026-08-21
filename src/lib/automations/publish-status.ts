import { randomUUID } from "node:crypto";
import {
  claimAutomationPublicationRecovery,
  failAutomationPublication,
  recordAutomationPublicationProgress,
  refreshAutomationPublicationStatus,
  releaseAutomationPublicationRecovery,
} from "@/lib/automation-publishing";
import {
  isAutomationRecord,
  type AutomationPublication,
  type AutomationRecord,
} from "@/lib/automations";
import { refreshIntegrationPublicationStatus } from "@/lib/integrations/service";
import { IntegrationPublicationTerminalError } from "@/lib/integrations/publishing";
import { noStoreJson } from "@/lib/http";
import { storage } from "@/lib/storage";
import { updateWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";
import { publishingError } from "./publish-errors";
import { loadPublicationVideo } from "./publish-media";

export async function refreshSubmittedAutomationPublication(input: {
  id: string;
  automation: AutomationRecord;
}) {
  const { id, automation } = input;
  const publication = automation.publication;
  if (!publication || publication.status !== "submitted") {
    return noStoreJson(
      { error: "This publication does not have a provider status to refresh" },
      { status: 409 }
    );
  }
  if (!publication.accountId) {
    return noStoreJson(
      {
        error:
          "YouTube provider identifiers expired and were deleted. Verify the outcome in YouTube, then use the manual resolution control.",
      },
      { status: 409 }
    );
  }
  const recoveryLeaseId =
    publication.provider === "tiktok" ? null : randomUUID();
  if (recoveryLeaseId) {
    let lease: ReturnType<typeof claimAutomationPublicationRecovery> | null = null;
    await updateWorkspaceFeatureRecords<AutomationRecord>(
      "automations",
      (records) => {
        lease = claimAutomationPublicationRecovery(records, {
          automationId: id,
          attemptId: publication.attemptId,
          leaseId: recoveryLeaseId,
          now: new Date().toISOString(),
        });
        return lease.records;
      }
    );
    const claimedLease = lease as ReturnType<
      typeof claimAutomationPublicationRecovery
    > | null;
    if (!claimedLease?.claimed) {
      return noStoreJson(
        { publication: claimedLease?.publication ?? publication, duplicate: true },
        { status: 202 }
      );
    }
  }
  try {
  let recoveryMedia:
    | {
        id: string;
        filename: string;
        mimeType: string;
        width: number | null;
        height: number | null;
        durationSec: number | null;
        bytes: Buffer;
      }
    | undefined;
  if (publication.provider === "youtube" && !publication.externalId) {
    const recoveryFile = await loadPublicationVideo(publication.assetId);
    recoveryMedia = {
      id: recoveryFile.id,
      filename: recoveryFile.filename,
      mimeType: recoveryFile.mimeType,
      width: recoveryFile.width,
      height: recoveryFile.height,
      durationSec: recoveryFile.durationSec,
      bytes: await storage.read(recoveryFile.localPath),
    };
  }
  const providerStatus = await refreshIntegrationPublicationStatus(
    publication.provider,
    {
      expectedAccountId: publication.accountId,
      attemptId: publication.attemptId,
      externalId: publication.externalId,
      media: recoveryMedia,
      visibility: publication.visibility ?? "private",
      providerStatus: publication.providerStatus,
      onProgress: async (progress) => {
        await updateWorkspaceFeatureRecords<AutomationRecord>(
          "automations",
          (records) =>
            recordAutomationPublicationProgress(records, {
              automationId: id,
              attemptId: publication.attemptId,
              progress,
              now: new Date().toISOString(),
            }).records
        );
      },
    }
  );
  let persistedPublication: AutomationPublication | null = null;
  await updateWorkspaceFeatureRecords<AutomationRecord>(
    "automations",
    (records) => {
      const refreshed = refreshAutomationPublicationStatus(records, {
        automationId: id,
        attemptId: publication.attemptId,
        status: providerStatus,
        now: new Date().toISOString(),
      });
      persistedPublication =
        refreshed.publication ??
        refreshed.records.find(
          (candidate) =>
            candidate.id === id && isAutomationRecord(candidate)
        )?.publication ??
        null;
      return refreshed.records;
    }
  );
  const refreshedPublication = persistedPublication as AutomationPublication | null;
  if (!refreshedPublication) {
    throw new Error("Refreshed publication status could not be persisted");
  }
  return noStoreJson({ publication: refreshedPublication });
  } catch (cause) {
    const failure = publishingError(cause);
    let failed: ReturnType<typeof failAutomationPublication> | null = null;
    try {
      await updateWorkspaceFeatureRecords<AutomationRecord>(
        "automations",
        (records) => {
          failed = failAutomationPublication(records, {
            automationId: id,
            attemptId: publication.attemptId,
            error: failure.message,
            now: new Date().toISOString(),
            keepSubmitted: !(
              cause instanceof IntegrationPublicationTerminalError
            ),
          });
          return failed.records;
        }
      );
    } catch {
      // Provider reconciliation remains fail-closed if the diagnostic
      // status cannot be persisted.
    }
    const persistedFailure = failed as ReturnType<
      typeof failAutomationPublication
    > | null;
    return noStoreJson(
      {
        error: failure.message,
        publication: persistedFailure?.publication ?? publication,
      },
      { status: failure.statusCode }
    );
  } finally {
    if (recoveryLeaseId) {
      await updateWorkspaceFeatureRecords<AutomationRecord>(
        "automations",
        (records) =>
          releaseAutomationPublicationRecovery(records, {
            automationId: id,
            attemptId: publication.attemptId,
            leaseId: recoveryLeaseId,
            now: new Date().toISOString(),
          }).records
      );
    }
  }
}
