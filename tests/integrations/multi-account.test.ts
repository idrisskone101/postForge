import assert from "node:assert/strict";
import {
  completeOAuthConnection,
  disconnectIntegrationAccount,
  getIntegrationPerformanceResponse,
  getPublicIntegrationStatus,
  syncIntegrationAccount,
} from "../../src/lib/integrations/service";
import {
  createMemoryIntegrationStorage,
  readIntegrationConnection,
  readProviderMetrics,
} from "../../src/lib/integrations/store";

const key = Buffer.alloc(32, 6);
const env = {
  POSTFORGE_PUBLIC_URL: "https://postforge.example",
  INTEGRATION_ENCRYPTION_KEY: key.toString("base64"),
  TIKTOK_CLIENT_KEY: "tt-key",
  TIKTOK_CLIENT_SECRET: "tt-secret",
  INSTAGRAM_CLIENT_ID: "ig-id",
  INSTAGRAM_CLIENT_SECRET: "ig-secret",
  FFPROBE_PATH: "/definitely/missing/postforge-ffprobe",
};

async function connectTikTok(
  storage: ReturnType<typeof createMemoryIntegrationStorage>,
  openId: string,
  displayName: string,
  scope = "user.info.basic,video.list"
) {
  return completeOAuthConnection("tiktok", "oauth-code", {
    env,
    storage,
    now: new Date("2026-08-03T12:00:00.000Z"),
    fetch: async (input) => {
      const url = String(input);
      if (url.includes("oauth/token")) {
        return Response.json({
          access_token: `${openId}-access`,
          refresh_token: `${openId}-refresh`,
          expires_in: 3600,
          scope,
        });
      }
      return Response.json({
        data: { user: { open_id: openId, display_name: displayName } },
        error: { code: "ok" },
      });
    },
  });
}

async function syncTikTok(
  storage: ReturnType<typeof createMemoryIntegrationStorage>,
  accountId: string,
  videoIds: string[]
) {
  return syncIntegrationAccount("tiktok", accountId, {
    env,
    storage,
    now: new Date("2026-08-03T13:00:00.000Z"),
    fetch: async (input) => {
      const url = String(input);
      if (url.includes("oauth/token")) {
        return Response.json({
          access_token: `${accountId}-fresh-access`,
          refresh_token: `${accountId}-fresh-refresh`,
          expires_in: 3600,
          scope: "user.info.basic,video.list",
        });
      }
      if (url.includes("user/info")) {
        return Response.json({
          data: { user: { open_id: accountId, display_name: accountId } },
          error: { code: "ok" },
        });
      }
      return Response.json({
        data: {
          videos: videoIds.map((id, index) => ({
            id,
            title: `Video ${index + 1}`,
            create_time: 1785782400 + index,
            view_count: 100 + index,
            like_count: 10 + index,
            comment_count: 2 + index,
            share_count: 1 + index,
          })),
          cursor: 0,
          has_more: false,
        },
        error: { code: "ok" },
      });
    },
  });
}

async function run() {
  const storage = createMemoryIntegrationStorage();

  const first = await connectTikTok(storage, "creator-one", "Creator One");
  assert.equal(first.accounts.length, 1);
  assert.equal(first.accounts[0].account.id, "creator-one");
  assert.equal(first.accounts[0].sync.status, "never");

  const second = await connectTikTok(storage, "creator-two", "Creator Two");
  assert.equal(second.accounts.length, 1);
  assert.equal(second.accounts[0].account.id, "creator-two");

  const status = await getPublicIntegrationStatus("tiktok", { env, storage });
  assert.equal(status.connected, true);
  assert.equal(status.accountCount, 2);
  assert.deepEqual(
    status.accounts.map((account) => account.account.id).sort(),
    ["creator-one", "creator-two"]
  );

  const syncedOne = await syncTikTok(storage, "creator-one", ["v1", "v2"]);
  assert.equal(syncedOne.posts.length, 2);
  assert.equal(syncedOne.posts[0].accountId, "creator-one");
  const syncedTwo = await syncTikTok(storage, "creator-two", ["v3"]);
  assert.equal(syncedTwo.posts.length, 1);
  assert.equal(syncedTwo.posts[0].accountId, "creator-two");

  const metricsOne = await readProviderMetrics(
    "tiktok",
    "creator-one",
    storage
  );
  assert.equal(metricsOne?.posts.length, 2);
  const metricsTwo = await readProviderMetrics(
    "tiktok",
    "creator-two",
    storage
  );
  assert.equal(metricsTwo?.posts.length, 1);

  const performance = await getIntegrationPerformanceResponse({ env, storage });
  assert.equal(performance.posts.length, 3);
  assert.deepEqual(
    performance.posts.map((post) => post.accountId).sort(),
    ["creator-one", "creator-one", "creator-two"]
  );

  const disconnectedOne = await disconnectIntegrationAccount(
    "tiktok",
    "creator-one",
    {
      env,
      storage,
      fetch: async () => new Response(null, { status: 200 }),
    }
  );
  assert.equal(disconnectedOne.accountCount, 1);
  assert.equal(disconnectedOne.accounts[0].account.id, "creator-two");
  assert.equal(
    await readIntegrationConnection("tiktok", "creator-one", key, storage),
    null
  );
  assert.equal(
    await readProviderMetrics("tiktok", "creator-one", storage),
    null
  );
  const retainedMetrics = await readProviderMetrics(
    "tiktok",
    "creator-two",
    storage
  );
  assert.notEqual(retainedMetrics, null);
  const afterDisconnect = await getIntegrationPerformanceResponse({
    env,
    storage,
  });
  assert.deepEqual(
    afterDisconnect.posts.map((post) => post.accountId),
    ["creator-two"]
  );

  const reconnectedSame = await connectTikTok(
    storage,
    "creator-two",
    "Creator Two Renamed"
  );
  assert.equal(reconnectedSame.accountCount, 1);
  assert.equal(reconnectedSame.accounts[0].account.id, "creator-two");

  console.log("Multi-account integration checks passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
