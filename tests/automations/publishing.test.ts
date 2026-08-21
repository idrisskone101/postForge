import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { automationsHubSource } from "./hub-source";
import {
  claimAutomationPublication,
  claimAutomationPublicationRecovery,
  completeAutomationPublication,
  failAutomationPublication,
  manuallyResolveUnknownPublication,
  publicationProgressMayHaveCrossedPostBoundary,
  recoverStalePendingPublication,
  refreshAutomationPublicationStatus,
  releaseAutomationPublicationRecovery,
} from "../../src/lib/automation-publishing";
import {
  assertAssetsAreNotPublicationLeased,
  assertProviderHasNoUnresolvedPublication,
  assertReconnectCompatibleWithPublications,
  publicationIsUnresolved,
  UnresolvedPublicationConflictError,
} from "../../src/lib/publication-lifecycle";
import {
  createAutomationRecord,
  type AutomationPublication,
  type AutomationRecord,
} from "../../src/lib/automations";
import {
  completeOAuthConnection,
  disconnectIntegrationAccount,
  IntegrationMutationSupersededError,
  publishIntegrationShort,
} from "../../src/lib/integrations/service";
import {
  createMemoryIntegrationStorage,
  readIntegrationConnection,
  saveIntegrationConnection,
} from "../../src/lib/integrations/store";
import type { DecryptedIntegrationConnection } from "../../src/lib/integrations/types";
import {
  truncateUtf16Units,
  truncateUtf8Bytes,
} from "../../src/lib/unicode";

function record(): AutomationRecord {
  const value = createAutomationRecord();
  return {
    ...value,
    id: "automation-1",
    destination: "tiktok",
    accountId: "account-1",
    accountLabel: "Creator",
    approvalRequired: true,
    content: { ...value.content, sourceFileId: "asset-1" },
  };
}

function publication(
  overrides: Partial<AutomationPublication> = {}
): AutomationPublication {
  return {
    attemptId: "attempt-1",
    attemptNumber: 1,
    idempotencyKey: "key-1",
    provider: "tiktok",
    assetId: "asset-1",
    accountId: "account-1",
    status: "submitted",
    requestedAt: "2026-08-03T10:00:00.000Z",
    updatedAt: "2026-08-03T10:00:00.000Z",
    externalId: null,
    providerStatus: "INIT_OUTCOME_UNKNOWN",
    visibility: "private",
    providerVisibility: null,
    error: "Provider outcome unknown",
    recoveryLeaseId: null,
    recoveryClaimedAt: null,
    manualResolution: null,
    manuallyResolvedAt: null,
    ...overrides,
  };
}

async function run() {
  const exactUtf16Boundary = `${"a".repeat(2198)}😀`;
  assert.equal(exactUtf16Boundary.length, 2200);
  assert.equal(truncateUtf16Units(exactUtf16Boundary, 2200), exactUtf16Boundary);
  const crossingUtf16Boundary = `${"a".repeat(2199)}😀`;
  const safeUtf16Truncation = truncateUtf16Units(
    crossingUtf16Boundary,
    2200
  );
  assert.equal(safeUtf16Truncation, "a".repeat(2199));
  assert.equal(safeUtf16Truncation.endsWith("\ud83d"), false);
  const exactUtf8Boundary = "😀".repeat(1250);
  assert.equal(Buffer.byteLength(exactUtf8Boundary, "utf8"), 5000);
  assert.equal(truncateUtf8Bytes(exactUtf8Boundary, 5000), exactUtf8Boundary);
  const safeUtf8Truncation = truncateUtf8Bytes(
    `${"a".repeat(4999)}😀`,
    5000
  );
  assert.equal(Buffer.byteLength(safeUtf8Truncation, "utf8"), 4999);
  assert.equal(safeUtf8Truncation, "a".repeat(4999));
  for (const malformed of ["\ud83d", "\udc00"]) {
    assert.equal(truncateUtf16Units(malformed, 2200), "\ufffd");
    assert.equal(truncateUtf8Bytes(malformed, 5000), "\ufffd");
    assert.equal(truncateUtf8Bytes(malformed, 2), "");
  }

  const initial = [record()];
  assert.equal(
    publicationProgressMayHaveCrossedPostBoundary("INIT_REQUEST_SENT"),
    false,
    "an explicit init rejection remains safe to retry"
  );
  assert.equal(
    publicationProgressMayHaveCrossedPostBoundary("INITIALIZED"),
    true,
    "a TikTok publish id can still finish after authorization is lost"
  );
  assert.equal(
    publicationProgressMayHaveCrossedPostBoundary("UPLOAD_REQUEST_SENT"),
    true,
    "sending YouTube media bytes can create a video before any 201 is observed"
  );
  const acceptedBeforeAuthLoss = {
    ...record(),
    publication: publication({
      providerStatus: "INITIALIZED",
      externalId: "publish-id",
      error: null,
    }),
  };
  const acceptedAuthFailure = failAutomationPublication(
    [acceptedBeforeAuthLoss],
    {
      automationId: "automation-1",
      attemptId: "attempt-1",
      error: "Reconnect TikTok before checking this post",
      now: "2026-08-03T10:01:00.000Z",
      keepSubmitted: publicationProgressMayHaveCrossedPostBoundary(
        acceptedBeforeAuthLoss.publication.providerStatus ?? ""
      ),
    }
  );
  assert.equal(acceptedAuthFailure.publication?.status, "submitted");
  const rejectedBeforeAcceptance = {
    ...record(),
    publication: publication({
      status: "pending",
      providerStatus: "INIT_REQUEST_SENT",
      externalId: null,
      error: null,
    }),
  };
  const rejectedAuthFailure = failAutomationPublication(
    [rejectedBeforeAcceptance],
    {
      automationId: "automation-1",
      attemptId: "attempt-1",
      error: "TikTok rejected authorization before accepting the post",
      now: "2026-08-03T10:01:00.000Z",
      keepSubmitted: publicationProgressMayHaveCrossedPostBoundary(
        rejectedBeforeAcceptance.publication.providerStatus ?? ""
      ),
    }
  );
  assert.equal(rejectedAuthFailure.publication?.status, "failed");
  let boundaryFlagBeforeFailedWrite = false;
  await assert.rejects(async () => {
    boundaryFlagBeforeFailedWrite ||=
      publicationProgressMayHaveCrossedPostBoundary("INITIALIZED");
    throw new Error("simulated durable progress write failure");
  });
  assert.equal(
    boundaryFlagBeforeFailedWrite,
    true,
    "post-boundary persistence failure must remain fail-closed against retry"
  );
  const first = claimAutomationPublication(initial, {
    automationId: "automation-1",
    provider: "tiktok",
    accountId: "account-1",
    assetId: "asset-1",
    attemptId: "attempt-1",
    now: "2026-08-03T10:00:00.000Z",
    retryFailed: false,
  });
  assert.equal(first.claimed, true);
  assert.equal(first.publication.status, "pending");
  const duplicate = claimAutomationPublication(first.records, {
    automationId: "automation-1",
    provider: "tiktok",
    accountId: "account-1",
    assetId: "asset-1",
    attemptId: "attempt-2",
    now: "2026-08-03T10:00:01.000Z",
    retryFailed: false,
  });
  assert.equal(duplicate.claimed, false);
  assert.equal(duplicate.publication.attemptId, "attempt-1");

  const competingRecords = [
    record(),
    { ...record(), id: "automation-2", name: "Competing automation" },
  ];
  const firstCrossAutomationClaim = claimAutomationPublication(
    competingRecords,
    {
      automationId: "automation-1",
      provider: "tiktok",
      accountId: "account-1",
      assetId: "asset-1",
      attemptId: "cross-attempt-1",
      now: "2026-08-03T10:00:00.000Z",
      retryFailed: false,
    }
  );
  assert.throws(
    () =>
      claimAutomationPublication(firstCrossAutomationClaim.records, {
        automationId: "automation-2",
        provider: "tiktok",
        accountId: "account-1",
        assetId: "asset-1",
        attemptId: "cross-attempt-2",
        now: "2026-08-03T10:00:00.001Z",
        retryFailed: false,
      }),
    /already has an unresolved publication/,
    "A second automation cannot publish the same approved asset to the same account"
  );

  let concurrentRecords = competingRecords;
  let concurrentTail = Promise.resolve();
  function lockedConcurrentClaim(
    input: Parameters<typeof claimAutomationPublication>[1]
  ) {
    const result = concurrentTail.then(() => {
      const claimed = claimAutomationPublication(concurrentRecords, input);
      concurrentRecords = claimed.records;
      return claimed;
    });
    concurrentTail = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }
  const concurrentClaims = await Promise.allSettled([
    lockedConcurrentClaim({
      automationId: "automation-1",
      provider: "tiktok",
      accountId: "account-1",
      assetId: "asset-1",
      attemptId: "concurrent-attempt-1",
      now: "2026-08-03T10:00:00.000Z",
      retryFailed: false,
    }),
    lockedConcurrentClaim({
      automationId: "automation-2",
      provider: "tiktok",
      accountId: "account-1",
      assetId: "asset-1",
      attemptId: "concurrent-attempt-2",
      now: "2026-08-03T10:00:00.000Z",
      retryFailed: false,
    }),
  ]);
  assert.equal(
    concurrentClaims.filter((result) => result.status === "fulfilled").length,
    1,
    "The serialized global claim admits only one of two concurrent automations"
  );
  assert.equal(
    concurrentClaims.filter((result) => result.status === "rejected").length,
    1
  );

  const preBoundaryPersistenceFailure = failAutomationPublication(first.records, {
    automationId: "automation-1",
    attemptId: "attempt-1",
    error: "durable progress write failed before provider request",
    now: "2026-08-03T10:00:02.000Z",
    keepSubmitted: false,
  });
  assert.equal(preBoundaryPersistenceFailure.publication?.status, "failed");

  assert.throws(
    () => assertAssetsAreNotPublicationLeased(first.records, ["asset-1"]),
    UnresolvedPublicationConflictError
  );
  assert.throws(
    () =>
      assertProviderHasNoUnresolvedPublication(
        first.records,
        "tiktok",
        "account-1"
      ),
    UnresolvedPublicationConflictError
  );
  assert.throws(
    () =>
      assertReconnectCompatibleWithPublications(
        first.records,
        "tiktok",
        "different-account",
        true
      ),
    UnresolvedPublicationConflictError
  );
  assert.throws(
    () =>
      assertReconnectCompatibleWithPublications(
        first.records,
        "tiktok",
        "account-1",
        false
      ),
    UnresolvedPublicationConflictError
  );
  assert.doesNotThrow(() =>
    assertReconnectCompatibleWithPublications(
      first.records,
      "tiktok",
      "account-1",
      true
    )
  );

  const retentionUnknownRecord: AutomationRecord = {
    ...record(),
    destination: "youtube",
    accountId: "youtube-account-before-retention",
    publication: publication({
      provider: "youtube",
      accountId: null,
      status: "failed",
      providerStatus: "LOCAL_RETENTION_OUTCOME_UNKNOWN",
      error:
        "Provider identifiers expired before PostForge could verify the final outcome.",
      manualResolution: null,
    }),
  };
  assert.equal(publicationIsUnresolved(retentionUnknownRecord.publication), true);
  assert.throws(
    () =>
      assertAssetsAreNotPublicationLeased(
        [retentionUnknownRecord],
        ["asset-1"]
      ),
    UnresolvedPublicationConflictError,
    "Retention-unknown records keep the approved asset leased"
  );
  assert.throws(
    () =>
      assertProviderHasNoUnresolvedPublication(
        [retentionUnknownRecord],
        "youtube",
        "any-current-youtube-account"
      ),
    UnresolvedPublicationConflictError,
    "A scrubbed retention-unknown record conservatively keeps the provider lease"
  );
  const competingYouTube: AutomationRecord = {
    ...record(),
    id: "automation-2",
    destination: "youtube",
    accountId: "youtube-account-after-retention",
  };
  assert.throws(
    () =>
      claimAutomationPublication(
        [retentionUnknownRecord, competingYouTube],
        {
          automationId: "automation-2",
          provider: "youtube",
          accountId: "youtube-account-after-retention",
          assetId: "asset-1",
          attemptId: "youtube-after-retention",
          now: "2026-08-03T10:01:00.000Z",
          retryFailed: false,
        }
      ),
    /already has an unresolved publication/,
    "A scrubbed account id falls back to provider and asset duplicate protection"
  );
  const resolvedRetentionUnknown = manuallyResolveUnknownPublication(
    [retentionUnknownRecord, competingYouTube],
    {
      automationId: "automation-1",
      attemptId: "attempt-1",
      resolution: "not_published",
      now: "2026-08-03T17:00:00.000Z",
    }
  );
  assert.equal(
    publicationIsUnresolved(resolvedRetentionUnknown.publication),
    false
  );
  assert.doesNotThrow(() =>
    assertAssetsAreNotPublicationLeased(
      resolvedRetentionUnknown.records,
      ["asset-1"]
    )
  );
  assert.doesNotThrow(() =>
    assertProviderHasNoUnresolvedPublication(
      resolvedRetentionUnknown.records,
      "youtube",
      "youtube-account-after-retention"
    )
  );
  const afterManualResolution = claimAutomationPublication(
    resolvedRetentionUnknown.records,
    {
      automationId: "automation-2",
      provider: "youtube",
      accountId: "youtube-account-after-retention",
      assetId: "asset-1",
      attemptId: "youtube-after-resolution",
      now: "2026-08-03T17:00:01.000Z",
      retryFailed: false,
    }
  );
  assert.equal(afterManualResolution.claimed, true);

  assert.throws(() =>
    recoverStalePendingPublication(first.records, {
      automationId: "automation-1",
      attemptId: "attempt-1",
      now: "2026-08-03T10:04:59.000Z",
    })
  );
  const recovered = recoverStalePendingPublication(first.records, {
    automationId: "automation-1",
    attemptId: "attempt-1",
    now: "2026-08-03T10:05:00.000Z",
  });
  assert.equal(recovered.publication.status, "failed");
  const retry = claimAutomationPublication(recovered.records, {
    automationId: "automation-1",
    provider: "tiktok",
    accountId: "account-1",
    assetId: "asset-1",
    attemptId: "attempt-2",
    now: "2026-08-03T10:06:00.000Z",
    retryFailed: true,
  });
  assert.equal(retry.claimed, true);
  assert.equal(retry.publication.attemptNumber, 2);

  const submittedRecord = { ...record(), publication: publication() };
  const leaseOne = claimAutomationPublicationRecovery([submittedRecord], {
    automationId: "automation-1",
    attemptId: "attempt-1",
    leaseId: "lease-1",
    now: "2026-08-03T10:00:00.000Z",
  });
  assert.equal(leaseOne.claimed, true);
  const leaseDuplicate = claimAutomationPublicationRecovery(leaseOne.records, {
    automationId: "automation-1",
    attemptId: "attempt-1",
    leaseId: "lease-2",
    now: "2026-08-03T10:29:59.000Z",
  });
  assert.equal(leaseDuplicate.claimed, false);
  const leaseAfterExpiry = claimAutomationPublicationRecovery(leaseOne.records, {
    automationId: "automation-1",
    attemptId: "attempt-1",
    leaseId: "lease-2",
    now: "2026-08-03T10:30:00.000Z",
  });
  assert.equal(leaseAfterExpiry.claimed, true);
  const released = releaseAutomationPublicationRecovery(
    leaseAfterExpiry.records,
    {
      automationId: "automation-1",
      attemptId: "attempt-1",
      leaseId: "lease-2",
      now: "2026-08-03T10:30:01.000Z",
    }
  );
  assert.equal(released.publication?.recoveryLeaseId, null);

  assert.throws(() =>
    manuallyResolveUnknownPublication([submittedRecord], {
      automationId: "automation-1",
      attemptId: "attempt-1",
      resolution: "not_published",
      now: "2026-08-03T15:59:59.000Z",
    })
  );
  const negative = manuallyResolveUnknownPublication([submittedRecord], {
    automationId: "automation-1",
    attemptId: "attempt-1",
    resolution: "not_published",
    now: "2026-08-03T16:00:00.000Z",
  });
  assert.equal(negative.publication.status, "failed");
  assert.equal(negative.publication.manualResolution, "not_published");
  const positive = manuallyResolveUnknownPublication([submittedRecord], {
    automationId: "automation-1",
    attemptId: "attempt-1",
    resolution: "published",
    now: "2026-08-03T10:00:01.000Z",
  });
  assert.equal(positive.publication.status, "published");
  assert.equal(positive.publication.manualResolution, "published");

  const unreconciledYouTube = {
    ...record(),
    destination: "youtube" as const,
    publication: publication({
      provider: "youtube",
      providerStatus: "UPLOADED_PROCESSING",
      error: "Reconnect YouTube before checking this upload",
    }),
  };
  assert.throws(() =>
    manuallyResolveUnknownPublication([unreconciledYouTube], {
      automationId: "automation-1",
      attemptId: "attempt-1",
      resolution: "published",
      now: "2026-08-03T10:59:59.000Z",
    })
  );
  const reconciledManually = manuallyResolveUnknownPublication(
    [unreconciledYouTube],
    {
      automationId: "automation-1",
      attemptId: "attempt-1",
      resolution: "published",
      now: "2026-08-03T11:00:00.000Z",
    }
  );
  assert.equal(reconciledManually.publication.status, "published");
  assert.throws(() =>
    manuallyResolveUnknownPublication(
      [
        {
          ...unreconciledYouTube,
          publication: publication({
            provider: "youtube",
            providerStatus: "UPLOADED_PROCESSING",
            error: null,
          }),
        },
      ],
      {
        automationId: "automation-1",
        attemptId: "attempt-1",
        resolution: "not_published",
        now: "2026-08-03T12:00:00.000Z",
      }
    )
  );

  const actionableSpamFailure = refreshAutomationPublicationStatus(
    [submittedRecord],
    {
      automationId: "automation-1",
      attemptId: "attempt-1",
      status: {
        status: "failed",
        providerStatus: "FAILED:SPAM_RISK_TEXT",
      },
      now: "2026-08-03T10:01:00.000Z",
    }
  );
  assert.match(
    actionableSpamFailure.publication?.error ?? "",
    /rejected the caption as risky or spam/
  );

  const actualPrivacy = completeAutomationPublication(
    [{ ...record(), publication: publication({ status: "submitted" }) }],
    {
      automationId: "automation-1",
      attemptId: "attempt-1",
      result: {
        status: "submitted",
        externalId: "youtube-id",
        providerStatus: "UPLOADED_PROCESSING",
        visibility: "private",
        providerVisibility: "private",
      },
      now: "2026-08-03T10:01:00.000Z",
    }
  );
  assert.equal(actualPrivacy.publication?.providerVisibility, "private");

  const alreadyPublished = publication({
    status: "published",
    externalId: "instagram-media-id",
    providerStatus: "PUBLISHED",
    visibility: "public",
    providerVisibility: "PUBLIC",
  });
  const idempotentPublishedCompletion = completeAutomationPublication(
    [{ ...record(), publication: alreadyPublished }],
    {
      automationId: "automation-1",
      attemptId: "attempt-1",
      result: {
        status: "published",
        externalId: "instagram-media-id",
        providerStatus: "PUBLISHED",
        visibility: "public",
        providerVisibility: "PUBLIC",
      },
      now: "2026-08-03T10:02:00.000Z",
    }
  );
  assert.deepEqual(
    idempotentPublishedCompletion.publication,
    alreadyPublished,
    "a final provider progress write followed by the same completion must remain successful"
  );

  const conflictingPublishedCompletion = completeAutomationPublication(
    [{ ...record(), publication: alreadyPublished }],
    {
      automationId: "automation-1",
      attemptId: "attempt-1",
      result: {
        status: "published",
        externalId: "different-media-id",
        providerStatus: "PUBLISHED",
        visibility: "public",
        providerVisibility: "PUBLIC",
      },
      now: "2026-08-03T10:02:00.000Z",
    }
  );
  assert.equal(
    conflictingPublishedCompletion.publication,
    null,
    "a conflicting terminal result must still fail closed"
  );

  const encryptionKey = Buffer.alloc(32, 7);
  const integrationEnv = {
    POSTFORGE_PUBLIC_URL: "https://postforge.example",
    INTEGRATION_ENCRYPTION_KEY: encryptionKey.toString("base64"),
    TIKTOK_CLIENT_KEY: "client-key",
    TIKTOK_CLIENT_SECRET: "client-secret",
    TIKTOK_DIRECT_POST_APPROVAL_ACKNOWLEDGED: "true",
  };
  const existingConnection: DecryptedIntegrationConnection = {
    version: 1,
    provider: "tiktok",
    account: {
      id: "account-1",
      username: "creator",
      displayName: "Creator",
      avatarUrl: null,
      profileUrl: null,
    },
    grantedScopes: ["user.info.basic", "video.list", "video.publish"],
    tokens: {
      accessToken: "old-access",
      refreshToken: "old-refresh",
      expiresAt: "2026-08-03T18:00:00.000Z",
      refreshTokenExpiresAt: null,
      grantedScopes: ["user.info.basic", "video.list", "video.publish"],
      tokenType: "Bearer",
    },
    connectedAt: "2026-08-03T09:00:00.000Z",
    updatedAt: "2026-08-03T09:00:00.000Z",
    authorization: {
      status: "healthy",
      lastCheckedAt: "2026-08-03T09:00:00.000Z",
    },
    sync: {
      status: "never",
      lastAttemptAt: null,
      lastSuccessfulAt: null,
      warnings: [],
    },
  };
  const unresolvedRecord = {
    ...record(),
    publication: publication({ providerStatus: "PROCESSING_UPLOAD" }),
  };
  const disconnectStorage = createMemoryIntegrationStorage();
  await saveIntegrationConnection(
    existingConnection,
    encryptionKey,
    disconnectStorage
  );
  let revokeCalls = 0;
  await assert.rejects(
    () =>
      disconnectIntegrationAccount("tiktok", "account-1", {
        env: integrationEnv,
        storage: disconnectStorage,
        automationRecords: [unresolvedRecord],
        fetch: async () => {
          revokeCalls += 1;
          return new Response(null, { status: 200 });
        },
      }),
    UnresolvedPublicationConflictError
  );
  assert.equal(revokeCalls, 0, "disconnect guard runs before provider revocation");
  assert.equal(
    (await readIntegrationConnection("tiktok", "account-1", encryptionKey, disconnectStorage))
      ?.tokens.accessToken,
    "old-access"
  );

  const reconnectStorage = createMemoryIntegrationStorage();
  await saveIntegrationConnection(
    existingConnection,
    encryptionKey,
    reconnectStorage
  );
  let incompatibleRevoke = 0;
  await completeOAuthConnection("tiktok", "code", {
    env: integrationEnv,
    storage: reconnectStorage,
    automationRecords: [unresolvedRecord],
    now: new Date("2026-08-03T12:00:00.000Z"),
    fetch: async (input) => {
      const url = String(input);
      if (url.includes("oauth/token")) {
        return Response.json({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
          scope: "user.info.basic,video.list,video.publish",
        });
      }
      if (url.includes("user/info")) {
        return Response.json({
          data: {
            user: { open_id: "different-account", display_name: "Other" },
          },
          error: { code: "ok" },
        });
      }
      incompatibleRevoke += 1;
      return new Response(null, { status: 200 });
    },
  });
  assert.equal(
    incompatibleRevoke,
    0,
    "connecting an additional account must not revoke the published account"
  );
  assert.equal(
    (await readIntegrationConnection("tiktok", "account-1", encryptionKey, reconnectStorage))
      ?.tokens.accessToken,
    "old-access",
    "the unresolved publication's account remains connected when a new account is added"
  );
  assert.equal(
    (await readIntegrationConnection("tiktok", "different-account", encryptionKey, reconnectStorage))
      ?.tokens.accessToken,
    "new-access",
    "the additional account is stored alongside the published account"
  );

  const authRaceStorage = createMemoryIntegrationStorage();
  await saveIntegrationConnection(
    existingConnection,
    encryptionKey,
    authRaceStorage
  );
  const newerConnection: DecryptedIntegrationConnection = {
    ...existingConnection,
    tokens: {
      ...existingConnection.tokens,
      accessToken: "newer-access",
      refreshToken: "newer-refresh",
    },
    updatedAt: "2026-08-03T12:00:01.000Z",
  };
  let publishFetchCall = 0;
  await assert.rejects(
    () =>
      publishIntegrationShort(
        "tiktok",
        {
          expectedAccountId: "account-1",
          attemptId: "attempt-auth-race",
          media: {
            id: "asset-1",
            filename: "approved.mp4",
            mimeType: "video/mp4",
            width: 1080,
            height: 1920,
            durationSec: 15,
            bytes: Buffer.from("video"),
          },
          caption: "caption",
          tiktokSettings: {
            privacyLevel: "SELF_ONLY",
            allowComment: false,
            allowDuet: false,
            allowStitch: false,
            brandContent: false,
            brandOrganic: false,
          },
          onProgress: async () => undefined,
        },
        {
          env: integrationEnv,
          storage: authRaceStorage,
          now: new Date("2026-08-03T12:00:00.000Z"),
          fetch: async (input) => {
            publishFetchCall += 1;
            const url = String(input);
            if (url.includes("user/info")) {
              return Response.json({
                data: {
                  user: { open_id: "account-1", display_name: "Creator" },
                },
                error: { code: "ok" },
              });
            }
            if (url.includes("creator_info")) {
              return Response.json({
                data: {
                  creator_username: "creator",
                  creator_nickname: "Creator",
                  privacy_level_options: ["SELF_ONLY"],
                  comment_disabled: false,
                  duet_disabled: false,
                  stitch_disabled: false,
                  max_video_post_duration_sec: 180,
                },
                error: { code: "ok" },
              });
            }
            await saveIntegrationConnection(
              newerConnection,
              encryptionKey,
              authRaceStorage
            );
            return Response.json(
              { error: { code: "access_token_invalid" } },
              { status: 401 }
            );
          },
        }
      ),
    IntegrationMutationSupersededError
  );
  assert.ok(publishFetchCall >= 3);
  const afterAuthRace = await readIntegrationConnection(
    "tiktok",
    "account-1",
    encryptionKey,
    authRaceStorage
  );
  assert.equal(afterAuthRace?.tokens.accessToken, "newer-access");
  assert.equal(afterAuthRace?.authorization.status, "healthy");

  const publishRoute = readFileSync(
    new URL("../../src/lib/automation-publish-orchestration.ts", import.meta.url),
    "utf8"
  );
  const globalClaimLockIndex = publishRoute.indexOf(
    "withLockedAutomationRecords(async (records, transaction)"
  );
  const claimIndex = publishRoute.indexOf(
    "claimAutomationPublication(records",
    globalClaimLockIndex
  );
  assert.ok(
    globalClaimLockIndex >= 0 && claimIndex > globalClaimLockIndex,
    "cross-automation duplicate checks run inside the global automation claim lock"
  );
  const progressCallbackIndex = publishRoute.lastIndexOf(
    "onProgress: async (progress)"
  );
  const boundaryLatchIndex = publishRoute.indexOf(
    "providerOutcomeMayExist ||=",
    progressCallbackIndex
  );
  const progressPersistenceIndex = publishRoute.indexOf(
    "await updateWorkspaceFeatureRecords<AutomationRecord>",
    progressCallbackIndex
  );
  assert.ok(
    progressCallbackIndex >= 0 &&
      boundaryLatchIndex > progressCallbackIndex &&
      boundaryLatchIndex < progressPersistenceIndex,
    "post-boundary retry safety is latched before a fallible progress write"
  );
  assert.match(
    publishRoute,
    /keepSubmitted:\s*providerOutcomeMayExist\s*&&\s*!\(cause instanceof IntegrationPublicationTerminalError\)/,
    "authorization loss after a durable irreversible stage stays submitted"
  );
  assert.ok(
    publishRoute.indexOf("await storage.size(localPath)") <
      publishRoute.indexOf("const bytes = await storage.read(file.localPath)"),
    "the practical media limit is checked before the full publish buffer read"
  );
  const signedMediaRoute = readFileSync(
    new URL(
      "../../src/app/api/integrations/publish-media/[id]/route.ts",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(signedMediaRoute, /await storage\.size\(file\.localPath\)/);
  assert.match(signedMediaRoute, /await storage\.readRange/);
  assert.match(signedMediaRoute, /"Cache-Control": "private, no-store"/);
  assert.doesNotMatch(
    signedMediaRoute,
    /"Cache-Control": "public, max-age=300"/
  );
  const publishingSource = readFileSync(
    new URL("../../src/lib/integrations/publishing.ts", import.meta.url),
    "utf8"
  );
  const uploadRequestStage = publishingSource.indexOf(
    'providerStatus: "UPLOAD_REQUEST_SENT"'
  );
  const uploadRequestFetch = publishingSource.indexOf(
    "response = await fetchImpl(uploadUrl",
    uploadRequestStage
  );
  assert.ok(
    uploadRequestStage >= 0 && uploadRequestStage < uploadRequestFetch,
    "YouTube upload boundary is persisted before sending non-empty media bytes"
  );
  const automationUi = automationsHubSource();
  assert.match(automationUi, /pf-safe-overlay/);
  assert.match(automationUi, /max-h-full/);
  assert.match(automationUi, /dark:bg-\[var\(--pf-active\)\] dark:text-\[var\(--pf-muted\)\]/);
  assert.match(automationUi, /dark:text-\[var\(--pf-orange\)\]/);
  assert.match(
    automationUi,
    /By posting, you agree to TikTok's Music Usage Confirmation/
  );
  assert.match(automationUi, /failedReconciliationStage/);
  assert.match(automationUi, /Select whether this video is made for kids/);
  assert.match(automationUi, /YouTube Community Guidelines/);
  assert.match(
    automationUi,
    /record\.publication\?\.providerStatus !==\s*"LOCAL_RETENTION_OUTCOME_UNKNOWN"/,
    "retention-unknown outcomes must not offer a dead-end retry action"
  );
  assert.doesNotMatch(
    automationUi,
    /youtubeTitle}\s*maxLength=\{100\}/,
    "YouTube title entry must not impose a UTF-16 native maxLength"
  );
  assert.match(publishRoute, /unicodeCodePointLength\(settings\.title\)/);
  assert.match(publishRoute, /truncateUtf16Units\(/);
  assert.match(publishRoute, /!isWellFormedUnicode\(body\.caption\)/);
  assert.match(publishRoute, /!isWellFormedUnicode\(settings\.description\)/);
  assert.match(
    publishRoute,
    /description: truncateUtf8Bytes\(defaultCaption, 5000\)/
  );
  assert.match(publishRoute, /title: settings\.title,/);
  assert.match(publishRoute, /body\.caption\.length > 2200/);
  assert.match(publishRoute, /settings\.audienceConfirmed !== true/);
  assert.match(
    publishRoute,
    /settings\.communityGuidelinesConfirmed !== true/
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
