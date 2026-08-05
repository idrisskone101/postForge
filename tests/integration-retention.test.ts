import assert from "node:assert/strict";
import {
  claimAutomationPublication,
  manuallyResolveUnknownPublication,
} from "../src/lib/automation-publishing";
import {
  createAutomationRecord,
  type AutomationPublication,
  type AutomationRecord,
} from "../src/lib/automations";
import { isRetentionCronAuthorized } from "../src/lib/integrations/retention-auth";
import {
  scrubYouTubeAutomationProviderData,
  YOUTUBE_RETENTION_UNKNOWN_STATUS,
} from "../src/lib/integrations/retention-records";
import { runYouTubeDataRetentionSweep } from "../src/lib/integrations/retention";
import { forceDeleteLocalIntegrationData } from "../src/lib/integrations/service";
import {
  createMemoryIntegrationStorage,
  readIntegrationConnection,
  readProviderMetrics,
  saveIntegrationConnection,
  saveProviderMetrics,
} from "../src/lib/integrations/store";
import type { DecryptedIntegrationConnection } from "../src/lib/integrations/types";

const now = new Date("2026-08-03T12:00:00.000Z");

function youtubePublication(
  overrides: Partial<AutomationPublication> = {}
): AutomationPublication {
  return {
    attemptId: "youtube-attempt-1",
    attemptNumber: 1,
    idempotencyKey: "youtube-idempotency-1",
    provider: "youtube",
    assetId: "video-1",
    accountId: "youtube-account",
    status: "submitted",
    requestedAt: "2026-07-04T12:00:00.000Z",
    // A local lease/error update must not extend provider-data retention.
    updatedAt: "2026-08-02T12:00:00.000Z",
    externalId: "youtube-video-id",
    providerStatus: "UPLOADED_PROCESSING",
    visibility: "private",
    providerVisibility: "private",
    providerDataRefreshedAt: "2026-07-04T12:00:00.000Z",
    error: "raw provider detail",
    recoveryLeaseId: null,
    recoveryClaimedAt: null,
    manualResolution: null,
    manuallyResolvedAt: null,
    ...overrides,
  };
}

function youtubeAutomation(
  publication = youtubePublication()
): AutomationRecord {
  const record = createAutomationRecord();
  return {
    ...record,
    id: "youtube-automation",
    destination: "youtube",
    accountId: "youtube-account",
    accountLabel: "Old channel label",
    content: { ...record.content, sourceFileId: "video-1" },
    publication,
  };
}

async function run() {
  const scrubbed = scrubYouTubeAutomationProviderData(
    [youtubeAutomation()],
    {
      now,
      scrubAccountBindings: false,
      activeAccount: {
        id: "youtube-account",
        username: "@current",
        displayName: "Current channel",
      },
    }
  );
  const retained = scrubbed.records[0];
  assert.equal(retained.accountId, "youtube-account");
  assert.equal(retained.accountLabel, "Current channel");
  assert.equal(retained.publication?.accountId, null);
  assert.equal(retained.publication?.externalId, null);
  assert.equal(retained.publication?.providerVisibility, null);
  assert.equal(
    retained.publication?.providerStatus,
    YOUTUBE_RETENTION_UNKNOWN_STATUS
  );
  assert.equal(retained.publication?.status, "failed");
  assert.equal(retained.publication?.providerDataRefreshedAt, null);
  assert.match(retained.publication?.error ?? "", /did not reverify/);

  assert.throws(
    () =>
      claimAutomationPublication(scrubbed.records, {
        automationId: "youtube-automation",
        provider: "youtube",
        accountId: "youtube-account",
        assetId: "video-1",
        attemptId: "unsafe-retry",
        now: now.toISOString(),
        retryFailed: true,
      }),
    /resolve it before creating another publish attempt/
  );

  for (const resolution of ["published", "not_published"] as const) {
    const resolved = manuallyResolveUnknownPublication(scrubbed.records, {
      automationId: "youtube-automation",
      attemptId: "youtube-attempt-1",
      resolution,
      now: "2026-08-03T12:05:00.000Z",
    });
    assert.equal(
      resolved.publication.status,
      resolution === "published" ? "published" : "failed"
    );
    assert.equal(resolved.publication.manualResolution, resolution);
  }

  const terminalScrub = scrubYouTubeAutomationProviderData(
    [
      youtubeAutomation(
        youtubePublication({ status: "published", error: null })
      ),
    ],
    { now, scrubAccountBindings: true }
  ).records[0];
  assert.equal(terminalScrub.accountId, null);
  assert.equal(terminalScrub.accountLabel, null);
  assert.equal(terminalScrub.status, "needs_connection");
  assert.equal(terminalScrub.publication?.status, "published");
  assert.equal(terminalScrub.publication?.externalId, null);
  assert.equal(terminalScrub.publication?.providerStatus, null);
  assert.equal(terminalScrub.publication?.providerVisibility, null);
  assert.equal(
    terminalScrub.publication?.visibility,
    "private",
    "local user-requested visibility remains"
  );

  assert.equal(
    isRetentionCronAuthorized(
      new Request("https://postforge.example/api/integrations/retention", {
        headers: { Authorization: "Bearer cron-secret-value" },
      }),
      "cron-secret-value"
    ),
    true
  );
  assert.equal(
    isRetentionCronAuthorized(
      new Request("https://postforge.example/api/integrations/retention", {
        headers: { Authorization: "Bearer wrong" },
      }),
      "cron-secret-value"
    ),
    false
  );
  assert.equal(
    isRetentionCronAuthorized(
      new Request("https://postforge.example/api/integrations/retention"),
      undefined
    ),
    false,
    "a missing CRON_SECRET must fail closed"
  );

  const key = Buffer.alloc(32, 8);
  const env = {
    POSTFORGE_PUBLIC_URL: "https://postforge.example",
    INTEGRATION_ENCRYPTION_KEY: key.toString("base64"),
    YOUTUBE_CLIENT_ID: "youtube-client",
    YOUTUBE_CLIENT_SECRET: "youtube-secret",
    POSTFORGE_PRIVACY_POLICY_URL: "https://postforge.example/privacy",
    POSTFORGE_TERMS_URL: "https://postforge.example/terms",
    POSTFORGE_DATA_DELETION_URL: "https://postforge.example/data-deletion",
    CRON_SECRET: "retention-secret-value",
  };
  const storage = createMemoryIntegrationStorage();
  const connection: DecryptedIntegrationConnection = {
    version: 1,
    provider: "youtube",
    account: {
      id: "youtube-account",
      username: "@current",
      displayName: "Current channel",
      avatarUrl: null,
      profileUrl: "https://www.youtube.com/channel/youtube-account",
    },
    grantedScopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.upload",
    ],
    tokens: {
      accessToken: "youtube-access",
      refreshToken: "youtube-refresh",
      expiresAt: "2026-08-03T18:00:00.000Z",
      refreshTokenExpiresAt: null,
      grantedScopes: [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/youtube.upload",
      ],
      tokenType: "Bearer",
    },
    connectedAt: "2026-08-02T12:00:00.000Z",
    updatedAt: "2026-08-02T12:00:00.000Z",
    authorization: {
      status: "healthy",
      lastCheckedAt: "2026-08-02T12:00:00.000Z",
    },
    sync: {
      status: "ready",
      lastAttemptAt: "2026-08-02T12:00:00.000Z",
      lastSuccessfulAt: "2026-08-02T12:00:00.000Z",
      warnings: [],
    },
  };
  await saveIntegrationConnection(connection, key, storage);
  await saveProviderMetrics(
    {
      version: 1,
      provider: "youtube",
      posts: [],
      syncedAt: "2026-07-04T12:00:00.000Z",
    },
    "youtube-account",
    storage
  );
  storage.entries.set(
    "integrations/publish-sessions/youtube/youtube-attempt-1.json",
    Buffer.from(
      JSON.stringify({
        version: 1,
        provider: "youtube",
        attemptId: "youtube-attempt-1",
        createdAt: "2026-07-26T12:00:00.000Z",
      })
    )
  );
  storage.entries.set(
    "integrations/publish-sessions/youtube/recent-attempt.json",
    Buffer.from(
      JSON.stringify({
        version: 1,
        provider: "youtube",
        attemptId: "recent-attempt",
        createdAt: "2026-08-01T12:00:00.000Z",
      })
    )
  );
  const recentAutomation = {
    ...youtubeAutomation(
      youtubePublication({
        attemptId: "recent-attempt",
        requestedAt: "2026-08-01T12:00:00.000Z",
        updatedAt: "2026-08-01T12:00:00.000Z",
        providerDataRefreshedAt: "2026-08-01T12:00:00.000Z",
      })
    ),
    id: "recent-automation",
  };
  const expiredSessionAutomation = youtubeAutomation(
    youtubePublication({
      requestedAt: "2026-07-26T12:00:00.000Z",
      updatedAt: "2026-08-02T12:00:00.000Z",
      providerDataRefreshedAt: "2026-07-26T12:00:00.000Z",
    })
  );
  const sweepRecords = [expiredSessionAutomation, recentAutomation];
  const sweep = await runYouTubeDataRetentionSweep({
    env,
    storage,
    now,
    automationRecords: sweepRecords,
  });
  assert.equal(sweep.refreshAttempted, false);
  assert.equal(sweep.connectionDeleted, false);
  assert.equal(sweep.metricsDeleted, true);
  assert.equal(sweep.publishSessionsDeleted, 1);
  assert.equal(sweep.uploadRecoveriesExpired, 1);
  assert.equal(await readProviderMetrics("youtube", "youtube-account", storage), null);
  assert.equal(sweepRecords[0].publication?.externalId, null);
  assert.equal(sweepRecords[0].publication?.status, "failed");
  assert.equal(
    sweepRecords[0].publication?.providerStatus,
    YOUTUBE_RETENTION_UNKNOWN_STATUS
  );
  assert.equal(
    storage.entries.has(
      "integrations/publish-sessions/youtube/youtube-attempt-1.json"
    ),
    false,
    "the exact expired session key is deleted after its attempt is made manually resolvable"
  );
  assert.equal(sweepRecords[1].publication?.status, "submitted");
  assert.equal(
    storage.entries.has(
      "integrations/publish-sessions/youtube/recent-attempt.json"
    ),
    true,
    "an unresolved recoverable upload keeps its resumable session within seven days"
  );

  const forceStorage = createMemoryIntegrationStorage();
  await saveIntegrationConnection(connection, key, forceStorage);
  await saveProviderMetrics(
    {
      version: 1,
      provider: "youtube",
      posts: [],
      syncedAt: "2026-08-02T12:00:00.000Z",
    },
    "youtube-account",
    forceStorage
  );
  forceStorage.entries.set(
    "integrations/publish-sessions/youtube/terminal-attempt.json",
    Buffer.from("stored-session")
  );
  const forceRecords = [
    youtubeAutomation(
      youtubePublication({
        status: "published",
        requestedAt: "2026-08-02T12:00:00.000Z",
        updatedAt: "2026-08-02T12:00:00.000Z",
        providerDataRefreshedAt: "2026-08-02T12:00:00.000Z",
      })
    ),
  ];
  await forceDeleteLocalIntegrationData("youtube", "youtube-account", {
    env,
    storage: forceStorage,
    now,
    automationRecords: forceRecords,
  });
  assert.equal(
    await readIntegrationConnection("youtube", "youtube-account", key, forceStorage),
    null
  );
  assert.equal(await readProviderMetrics("youtube", "youtube-account", forceStorage), null);
  assert.equal(
    forceStorage.entries.has(
      "integrations/publish-sessions/youtube/terminal-attempt.json"
    ),
    false
  );
  assert.equal(forceRecords[0].accountId, null);
  assert.equal(forceRecords[0].publication?.externalId, null);
  assert.equal(forceRecords[0].publication?.providerStatus, null);
  assert.equal(forceRecords[0].publication?.providerVisibility, null);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
