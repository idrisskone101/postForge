import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  AutomationPublicationClaimError,
  claimAutomationPublication,
  claimAutomationPublicationRecovery,
  completeAutomationPublication,
  failAutomationPublication,
  recoverStalePendingPublication,
  releaseAutomationPublicationRecovery,
  manuallyResolveUnknownPublication,
  publicationProgressMayHaveCrossedPostBoundary,
  refreshAutomationPublicationStatus,
  recordAutomationPublicationProgress,
} from "@/lib/automation-publishing";
import {
  isAutomationRecord,
  isAutomationSocialDestination,
  type AutomationPublication,
  type AutomationRecord,
} from "@/lib/automations";
import {
  IntegrationAccountBindingError,
  IntegrationAuthorizationUnhealthyError,
  IntegrationMutationSupersededError,
  IntegrationNotConfiguredError,
  IntegrationNotConnectedError,
  IntegrationPublishScopeError,
  YouTubePolicyConsentRequiredError,
  getPublicIntegrationStatus,
  getTikTokPublishingPreflight,
  publishIntegrationShort,
  refreshIntegrationPublicationStatus,
} from "@/lib/integrations/service";
import {
  IntegrationMediaValidationError,
  IntegrationPublicationAmbiguousError,
  IntegrationPublicationTerminalError,
  assertSocialPublishMediaSizeBytes,
  TIKTOK_PRIVACY_LEVELS,
  type TikTokPrivacyLevel,
  type TikTokPublishSettings,
  type YouTubePublishSettings,
} from "@/lib/integrations/publishing";
import { IntegrationProviderError } from "@/lib/integrations/providers/http";
import { isSameOriginMutation, noStoreJson } from "@/lib/http";
import { rejectCrossOriginMutation } from "@/lib/integrations/routes";
import { storage } from "@/lib/storage";
import {
  isWellFormedUnicode,
  truncateUnicodeCodePoints,
  truncateUtf16Units,
  truncateUtf8Bytes,
  unicodeCodePointLength,
} from "@/lib/unicode";
import {
  readWorkspaceFeatureRecords,
  updateWorkspaceFeatureRecords,
} from "@/lib/workspace-feature-store";
import { withLockedAutomationRecords } from "@/lib/publication-lifecycle";

type PublishBody = {
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

type ApprovedVideo = {
  id: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  fileSizeBytes: number | null;
  localPath: string;
};

async function assertStoredPublishMedia(
  localPath: string,
  recordedSize: number | null
) {
  if (recordedSize !== null) {
    assertSocialPublishMediaSizeBytes(recordedSize);
  }
  let actualSize: number;
  try {
    actualSize = await storage.size(localPath);
  } catch {
    throw new AutomationPublicationClaimError(
      "The approved video's stored media is unavailable",
      422
    );
  }
  assertSocialPublishMediaSizeBytes(actualSize);
  if (recordedSize !== null && recordedSize !== actualSize) {
    throw new AutomationPublicationClaimError(
      "The approved video's stored size changed; regenerate and approve it before publishing",
      409
    );
  }
  return actualSize;
}

function safeCaption(automation: AutomationRecord) {
  return truncateUtf16Units(
    [automation.hook.selected.trim(), automation.cta.prompt.trim()]
      .filter(Boolean)
      .join("\n\n"),
    2200
  );
}

function validateTikTokSettings(value: unknown): TikTokPublishSettings | null {
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

function validateYouTubeSettings(
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

async function loadApprovedVideo(
  automation: AutomationRecord,
  requestedAssetId: unknown
): Promise<ApprovedVideo> {
  const assetId =
    typeof requestedAssetId === "string" ? requestedAssetId.trim() : "";
  if (!assetId || assetId !== automation.content.sourceFileId) {
    throw new AutomationPublicationClaimError(
      "Select the automation's approved Gallery video before publishing",
      422
    );
  }
  const file = await prisma.generatedFile.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      type: true,
      width: true,
      height: true,
      durationSec: true,
      fileSizeBytes: true,
      localPath: true,
      reviewStatus: true,
    },
  });
  if (
    !file ||
    file.type !== "video" ||
    !file.mimeType.startsWith("video/") ||
    file.reviewStatus !== "approved_output" ||
    !(await storage.exists(file.localPath))
  ) {
    throw new AutomationPublicationClaimError(
      "Publishing requires a generated Gallery video marked Approved output",
      422
    );
  }
  await assertStoredPublishMedia(file.localPath, file.fileSizeBytes);
  return file;
}

async function loadPublicationVideo(assetId: string): Promise<ApprovedVideo> {
  const file = await prisma.generatedFile.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      type: true,
      width: true,
      height: true,
      durationSec: true,
      fileSizeBytes: true,
      localPath: true,
    },
  });
  if (
    !file ||
    file.type !== "video" ||
    !file.mimeType.startsWith("video/") ||
    !(await storage.exists(file.localPath))
  ) {
    throw new AutomationPublicationClaimError(
      "The original video is unavailable for resumable upload recovery",
      409
    );
  }
  await assertStoredPublishMedia(file.localPath, file.fileSizeBytes);
  return file;
}

function publishingError(cause: unknown): {
  message: string;
  statusCode: number;
} {
  if (cause instanceof AutomationPublicationClaimError) {
    return { message: cause.message, statusCode: cause.statusCode };
  }
  if (cause instanceof IntegrationMediaValidationError) {
    return { message: cause.message, statusCode: 422 };
  }
  if (cause instanceof IntegrationPublicationTerminalError) {
    return { message: cause.message, statusCode: 422 };
  }
  if (cause instanceof IntegrationPublicationAmbiguousError) {
    return { message: cause.message, statusCode: 502 };
  }
  if (cause instanceof IntegrationNotConfiguredError) {
    return {
      message: "This provider is not configured for server publishing",
      statusCode: 503,
    };
  }
  if (cause instanceof IntegrationNotConnectedError) {
    return {
      message: "Connect this provider in Settings before publishing",
      statusCode: 409,
    };
  }
  if (cause instanceof IntegrationAuthorizationUnhealthyError) {
    return {
      message: "Reconnect this provider before publishing",
      statusCode: 409,
    };
  }
  if (cause instanceof IntegrationPublishScopeError) {
    return {
      message: "Reconnect this account and grant its publishing permission",
      statusCode: 409,
    };
  }
  if (cause instanceof YouTubePolicyConsentRequiredError) {
    return {
      message: cause.message,
      statusCode: 428,
    };
  }
  if (cause instanceof IntegrationAccountBindingError) {
    return {
      message: "The connected account changed; review the destination again",
      statusCode: 409,
    };
  }
  if (cause instanceof IntegrationMutationSupersededError) {
    return {
      message: "A newer connection change superseded this request; try again",
      statusCode: 409,
    };
  }
  if (cause instanceof IntegrationProviderError) {
    return {
      message:
        cause.status === null
          ? `${cause.message}; the provider did not confirm completion. Verify the destination before retrying.`
          : `${cause.message} (provider HTTP ${cause.status}). Nothing else will be sent automatically.`,
      statusCode: 502,
    };
  }
  return {
    message: "Provider publishing failed; nothing else will be sent automatically",
    statusCode: 500,
  };
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
      const publication = automation.publication;
      if (
        !publication ||
        body.consent !== true ||
        (body.resolution !== "published" && body.resolution !== "not_published")
      ) {
        return noStoreJson(
          { error: "Explicit confirmation and a verified provider outcome are required" },
          { status: 422 }
        );
      }
      let resolved: ReturnType<typeof manuallyResolveUnknownPublication> | null = null;
      await updateWorkspaceFeatureRecords<AutomationRecord>(
        "automations",
        (records) => {
          resolved = manuallyResolveUnknownPublication(records, {
            automationId: id,
            attemptId: publication.attemptId,
            resolution: body.resolution as "published" | "not_published",
            now: new Date().toISOString(),
          });
          return resolved.records;
        }
      );
      const result = resolved as ReturnType<
        typeof manuallyResolveUnknownPublication
      > | null;
      if (!result?.publication) throw new Error("Manual resolution was not persisted");
      return noStoreJson({ publication: result.publication });
    }
    if (action === "recover") {
      const publication = automation.publication;
      if (!publication) {
        return noStoreJson(
          { error: "This automation has no publication attempt to recover" },
          { status: 409 }
        );
      }
      let recovered: ReturnType<typeof recoverStalePendingPublication> | null = null;
      await updateWorkspaceFeatureRecords<AutomationRecord>(
        "automations",
        (records) => {
          recovered = recoverStalePendingPublication(records, {
            automationId: id,
            attemptId: publication.attemptId,
            now: new Date().toISOString(),
          });
          return recovered.records;
        }
      );
      const result = recovered as ReturnType<
        typeof recoverStalePendingPublication
      > | null;
      if (!result?.publication) throw new Error("Recovery was not persisted");
      return noStoreJson({ publication: result.publication });
    }
    if (action === "status") {
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
      const status = await getPublicIntegrationStatus(destination);
      const bound = status.accounts.find(
        (candidate) => candidate.account.id === accountId
      );
      if (
        status.configuration !== "ready" ||
        !status.connected ||
        !bound ||
        bound.authorization.status !== "healthy" ||
        !bound.capabilities.publish
      ) {
        throw new IntegrationPublishScopeError();
      }
      const tiktok =
        destination === "tiktok"
          ? await getTikTokPublishingPreflight(accountId)
          : null;
      return noStoreJson({
        provider: destination,
        account: tiktok?.account ?? bound.account,
        asset: {
          id: file.id,
          filename: file.filename,
          mimeType: file.mimeType,
          width: file.width,
          height: file.height,
          durationSec: file.durationSec,
          fileSizeBytes: file.fileSizeBytes,
          previewUrl: `/api/files/${encodeURIComponent(file.id)}`,
        },
        caption: defaultCaption,
        youtube:
          destination === "youtube"
            ? {
                title: truncateUnicodeCodePoints(
                  automation.hook.selected.trim(),
                  100
                ),
                description: truncateUtf8Bytes(defaultCaption, 5000),
              }
            : null,
        visibility:
          destination === "instagram" ? "public" : "private",
        creator: tiktok?.creator ?? null,
        tiktokDirectPostApprovalAcknowledged:
          tiktok?.directPostApprovalAcknowledged ?? false,
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
