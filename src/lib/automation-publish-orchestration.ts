import { randomUUID } from "node:crypto";
import {
  AutomationPublicationClaimError,
  claimAutomationPublication,
  completeAutomationPublication,
  failAutomationPublication,
  publicationProgressMayHaveCrossedPostBoundary,
  recordAutomationPublicationProgress,
} from "@/lib/automation-publishing";
import {
  isAutomationRecord,
  isAutomationSocialDestination,
  type AutomationPublication,
  type AutomationRecord,
} from "@/lib/automations";
import {
  IntegrationMediaValidationError,
  IntegrationPublicationTerminalError,
  type TikTokPublishSettings,
  type YouTubePublishSettings,
} from "@/lib/integrations/publishing";
import { publishIntegrationShort } from "@/lib/integrations/service";
import { isSameOriginMutation, noStoreJson } from "@/lib/http";
import { rejectCrossOriginMutation } from "@/lib/integrations/routes";
import { storage } from "@/lib/storage";
import { isWellFormedUnicode } from "@/lib/unicode";
import {
  readWorkspaceFeatureRecords,
  updateWorkspaceFeatureRecords,
} from "@/lib/workspace-feature-store";
import { withLockedAutomationRecords } from "@/lib/publication-lifecycle";
import { publishingError } from "@/lib/automations/publish-errors";
import {
  assertStoredPublishMedia,
  loadApprovedVideo,
} from "@/lib/automations/publish-media";
import { runAutomationPublishPreflight } from "@/lib/automations/publish-preflight";
import {
  recoverStaleAutomationPublication,
  resolveAutomationPublicationOutcome,
} from "@/lib/automations/publish-resolve";
import {
  safeCaption,
  validateTikTokSettings,
  validateYouTubeSettings,
  type PublishBody,
} from "@/lib/automations/publish-settings";
import { refreshSubmittedAutomationPublication } from "@/lib/automations/publish-status";

async function loadAutomation(id: string) {
  const records = await readWorkspaceFeatureRecords<AutomationRecord>(
    "automations"
  );
  return (
    records.find(
      (candidate) => candidate.id === id && isAutomationRecord(candidate)
    ) ?? null
  );
}

function publicPublication(publication: AutomationPublication) {
  return publication;
}

export async function runAutomationPublish(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  let claimedAttempt: { automationId: string; attemptId: string } | null = null;
  let providerOutcomeMayExist = false;
  try {
    const { id } = await params;
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) {
      return noStoreJson({ error: "Automation id is invalid" }, { status: 400 });
    }
    const body = (await request.json()) as PublishBody;
    const action = body.action;
    if (
      action !== "preflight" &&
      action !== "publish" &&
      action !== "status" &&
      action !== "recover" &&
      action !== "resolve"
    ) {
      return noStoreJson(
        { error: "action must be preflight, publish, status, recover, or resolve" },
        { status: 400 }
      );
    }
    const automation = await loadAutomation(id);
    if (!automation) {
      return noStoreJson({ error: "Automation was not found" }, { status: 404 });
    }
    if (action === "resolve") {
      return resolveAutomationPublicationOutcome({ id, automation, body });
    }
    if (action === "recover") {
      return recoverStaleAutomationPublication({ id, automation });
    }
    if (action === "status") {
      return refreshSubmittedAutomationPublication({ id, automation });
    }

    if (!isAutomationSocialDestination(automation.destination)) {
      return noStoreJson(
        { error: "Manual Review queue plans cannot publish externally" },
        { status: 409 }
      );
    }
    const destination = automation.destination;
    if (!automation.approvalRequired) {
      return noStoreJson(
        { error: "Social publishing requires approval to remain enabled" },
        { status: 409 }
      );
    }
    const accountId = automation.accountId?.trim();
    if (!accountId) {
      return noStoreJson(
        { error: "Choose a connected destination account first" },
        { status: 409 }
      );
    }
    const file = await loadApprovedVideo(automation, body.assetId);
    const defaultCaption = safeCaption(automation);
    let instagramLocalPath: string | undefined;
    if (destination === "instagram") {
      try {
        instagramLocalPath = await storage.ensureLocalFile(file.localPath);
      } catch {
        throw new IntegrationMediaValidationError(
          "PostForge could not inspect the Instagram video encoding; regenerate the approved asset"
        );
      }
    }

    if (action === "preflight") {
      return runAutomationPublishPreflight({
        automation,
        destination,
        accountId,
        file,
        defaultCaption,
      });
    }

    if (body.consent !== true) {
      return noStoreJson(
        { error: "Explicit publishing consent is required" },
        { status: 422 }
      );
    }
    if (
      (destination === "tiktok" || destination === "instagram") &&
      (typeof body.caption !== "string" ||
        body.caption.length > 2200 ||
        !isWellFormedUnicode(body.caption))
    ) {
      return noStoreJson(
        { error: `${destination === "tiktok" ? "TikTok" : "Instagram"} caption must be 2200 characters or fewer` },
        { status: 422 }
      );
    }
    const caption =
      typeof body.caption === "string" ? body.caption : defaultCaption;
    let tiktokSettings: TikTokPublishSettings | undefined;
    let youtubeSettings: YouTubePublishSettings | undefined;
    if (destination === "tiktok") {
      tiktokSettings = validateTikTokSettings(body.tiktok) ?? undefined;
      if (!tiktokSettings || body.musicUsageConfirmed !== true) {
        return noStoreJson(
          {
            error:
              "Choose TikTok privacy and disclosure settings and confirm Music Usage authorization",
          },
          { status: 422 }
        );
      }
      if (
        tiktokSettings.brandContent &&
        body.brandedPolicyConfirmed !== true
      ) {
        return noStoreJson(
          {
            error:
              "Confirm TikTok's Branded Content Policy before publishing commercial content",
          },
          { status: 422 }
        );
      }
    }
    if (destination === "youtube") {
      youtubeSettings = validateYouTubeSettings(body.youtube) ?? undefined;
      if (!youtubeSettings) {
        return noStoreJson(
          {
            error:
              "Choose YouTube title, description, privacy, and audience, then confirm Community Guidelines compliance",
          },
          { status: 422 }
        );
      }
    }

    const attemptId = randomUUID();
    const requestedAt = new Date().toISOString();
    let claim: ReturnType<typeof claimAutomationPublication> | null = null;
    claim = await withLockedAutomationRecords(async (records, transaction) => {
      const approved = await transaction.generatedFile.findUnique({
        where: { id: file.id },
        select: {
          id: true,
          type: true,
          mimeType: true,
          reviewStatus: true,
          localPath: true,
          fileSizeBytes: true,
        },
      });
      if (
        !approved ||
        approved.type !== "video" ||
        !approved.mimeType.startsWith("video/") ||
        approved.reviewStatus !== "approved_output" ||
        !(await storage.exists(approved.localPath))
      ) {
        throw new AutomationPublicationClaimError(
          "Publishing requires a generated Gallery video marked Approved output",
          422
        );
      }
      await assertStoredPublishMedia(
        approved.localPath,
        approved.fileSizeBytes
      );
      const persisted = claimAutomationPublication(records, {
          automationId: id,
          provider: destination,
          accountId,
          assetId: file.id,
          attemptId,
          now: requestedAt,
          retryFailed: body.retryFailed === true,
      });
      return { records: persisted.records, result: persisted };
    });
    if (!claim) throw new Error("Publication claim was not persisted");
    const persistedClaim = claim as ReturnType<typeof claimAutomationPublication>;
    if (!persistedClaim.claimed) {
      const statusCode =
        persistedClaim.publication.status === "pending" ||
        persistedClaim.publication.status === "submitted"
          ? 202
          : persistedClaim.publication.status === "failed"
            ? 409
            : 200;
      return noStoreJson(
        {
          publication: publicPublication(persistedClaim.publication),
          duplicate: true,
        },
        { status: statusCode }
      );
    }
    claimedAttempt = { automationId: id, attemptId };
    const bytes = await storage.read(file.localPath);
    const result = await publishIntegrationShort(destination, {
      expectedAccountId: accountId,
      attemptId,
      media: {
        id: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        width: file.width,
        height: file.height,
        durationSec: file.durationSec,
        bytes,
        localPath: instagramLocalPath,
      },
      caption,
      tiktokSettings,
      youtubeSettings,
      onProgress: async (progress) => {
        // Provider callbacks for INITIALIZED / OUTCOME_UNKNOWN / uploaded
        // processing happen after the external boundary. Set this in-memory
        // safety latch before persistence so a transient write failure cannot
        // incorrectly turn a possibly-live post into a retryable failure.
        providerOutcomeMayExist ||=
          publicationProgressMayHaveCrossedPostBoundary(
            progress.providerStatus
          );
        let persisted:
          | ReturnType<typeof recordAutomationPublicationProgress>
          | null = null;
        await updateWorkspaceFeatureRecords<AutomationRecord>(
          "automations",
          (records) => {
            persisted = recordAutomationPublicationProgress(records, {
              automationId: id,
              attemptId,
              progress,
              now: new Date().toISOString(),
            });
            return persisted.records;
          }
        );
        const persistedProgress = persisted as ReturnType<
          typeof recordAutomationPublicationProgress
        > | null;
        if (!persistedProgress?.publication) {
          throw new Error("Provider acceptance could not be persisted");
        }
      },
    });
    const completedAt = new Date().toISOString();
    let completed: ReturnType<typeof completeAutomationPublication> | null = null;
    await updateWorkspaceFeatureRecords<AutomationRecord>(
      "automations",
      (records) => {
        completed = completeAutomationPublication(records, {
          automationId: id,
          attemptId,
          result,
          now: completedAt,
        });
        return completed.records;
      }
    );
    const persistedCompletion = completed as ReturnType<
      typeof completeAutomationPublication
    > | null;
    if (!persistedCompletion?.publication) {
      throw new Error("Publication result could not be persisted");
    }
    claimedAttempt = null;
    return noStoreJson(
      { publication: publicPublication(persistedCompletion.publication) },
      { status: result.status === "submitted" ? 202 : 200 }
    );
  } catch (cause) {
    const failure = publishingError(cause);
    if (claimedAttempt) {
      let failed: ReturnType<typeof failAutomationPublication> | null = null;
      try {
        await updateWorkspaceFeatureRecords<AutomationRecord>(
          "automations",
          (records) => {
            failed = failAutomationPublication(records, {
              ...claimedAttempt!,
              error: failure.message,
              now: new Date().toISOString(),
              keepSubmitted:
                providerOutcomeMayExist &&
                !(cause instanceof IntegrationPublicationTerminalError),
            });
            return failed.records;
          }
        );
      } catch {
        // The response remains fail-closed even if a later storage failure
        // prevents the status update from being written.
      }
      const persistedFailure = failed as ReturnType<
        typeof failAutomationPublication
      > | null;
      return noStoreJson(
        {
          error: failure.message,
          publication: persistedFailure?.publication ?? null,
        },
        { status: failure.statusCode }
      );
    }
    return noStoreJson({ error: failure.message }, { status: failure.statusCode });
  }
}
