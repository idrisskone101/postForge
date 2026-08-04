import assert from "node:assert/strict";
import { getProviderOAuthConfig } from "../src/lib/integrations/config";
import {
  IntegrationMediaValidationError,
  IntegrationPublicationAmbiguousError,
  IntegrationPublicationTerminalError,
  MAX_SOCIAL_PUBLISH_MEDIA_BYTES,
  assertSocialPublishMediaSizeBytes,
  parseRetryAfterMilliseconds,
  publishProviderShort,
  queryTikTokCreatorPublishingInfo,
  queryTikTokPublishStatus,
  queryYouTubePublishStatus,
  resumeYouTubeUpload,
  youtubeResumableStatusIsRetryable,
  type ProviderPublishProgress,
} from "../src/lib/integrations/publishing";
import { IntegrationProviderError } from "../src/lib/integrations/providers/http";
import {
  assertInstagramMediaProbe,
  inspectInstagramReelMedia,
  InstagramMediaProbeError,
  instagramMediaProbeIsAvailable,
} from "../src/lib/integrations/instagram-media-probe";

const env = {
  POSTFORGE_PUBLIC_URL: "https://postforge.example",
  INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString("base64"),
  TIKTOK_CLIENT_KEY: "tt-key",
  TIKTOK_CLIENT_SECRET: "tt-secret",
  TIKTOK_DIRECT_POST_APPROVAL_ACKNOWLEDGED: "true",
  INSTAGRAM_CLIENT_ID: "ig-id",
  INSTAGRAM_CLIENT_SECRET: "ig-secret",
  YOUTUBE_CLIENT_ID: "yt-id",
  YOUTUBE_CLIENT_SECRET: "yt-secret",
  POSTFORGE_PRIVACY_POLICY_URL: "https://postforge.example/privacy",
  POSTFORGE_TERMS_URL: "https://postforge.example/terms",
  POSTFORGE_DATA_DELETION_URL: "https://postforge.example/data-deletion",
  CRON_SECRET: "retention-secret-value",
};

const account = {
  id: "account-1",
  username: "creator",
  displayName: "Creator",
  avatarUrl: null,
  profileUrl: null,
};

const media = {
  id: "asset-1",
  filename: "approved.mp4",
  mimeType: "video/mp4",
  width: 1080,
  height: 1920,
  durationSec: 24,
  bytes: Buffer.from("approved-video-bytes"),
  localPath: "/tmp/postforge-approved.mp4",
  publicUrl:
    "https://postforge.example/api/integrations/publish-media/token?asset=asset-1",
};

function tiktokCreator() {
  return Response.json({
    data: {
      creator_username: "creator",
      creator_nickname: "Creator",
      privacy_level_options: [
        "PUBLIC_TO_EVERYONE",
        "FOLLOWER_OF_CREATOR",
        "MUTUAL_FOLLOW_FRIENDS",
        "SELF_ONLY",
      ],
      comment_disabled: false,
      duet_disabled: false,
      stitch_disabled: false,
      max_video_post_duration_sec: 180,
    },
    error: { code: "ok" },
  });
}

async function run() {
  assert.equal(
    assertSocialPublishMediaSizeBytes(MAX_SOCIAL_PUBLISH_MEDIA_BYTES),
    MAX_SOCIAL_PUBLISH_MEDIA_BYTES
  );
  assert.throws(
    () =>
      assertSocialPublishMediaSizeBytes(
        MAX_SOCIAL_PUBLISH_MEDIA_BYTES + 1
      ),
    /up to 128 MB/
  );

  const tiktokConfig = getProviderOAuthConfig("tiktok", env)!;
  const tiktokCalls: Array<{ url: string; init?: RequestInit }> = [];
  const tiktokProgress: ProviderPublishProgress[] = [];
  const exactCaption = "First line\nEmoji stays exact 🥕";
  const tiktokResult = await publishProviderShort(
    {
      provider: "tiktok",
      config: tiktokConfig,
      accessToken: "secret-tiktok-token",
      account,
      media,
      caption: exactCaption,
      tiktokSettings: {
        privacyLevel: "FOLLOWER_OF_CREATOR",
        allowComment: true,
        allowDuet: false,
        allowStitch: false,
        brandContent: false,
        brandOrganic: true,
      },
    },
    {
      fetch: async (input, init) => {
        const url = String(input);
        tiktokCalls.push({ url, init });
        if (url.includes("creator_info")) return tiktokCreator();
        if (url.includes("video/init")) {
          const body = JSON.parse(String(init?.body));
          assert.equal(body.post_info.title, exactCaption);
          assert.equal(body.post_info.is_aigc, true);
          assert.equal(body.source_info.source, "PULL_FROM_URL");
          assert.equal(body.source_info.video_url, media.publicUrl);
          assert.equal(url.includes("secret-tiktok-token"), false);
          return Response.json({
            data: { publish_id: "publish-1" },
            error: { code: "ok" },
          });
        }
        return Response.json({
          data: { status: "PUBLISH_COMPLETE" },
          error: { code: "ok" },
        });
      },
      onProgress: async (progress) => {
        tiktokProgress.push(progress);
      },
    }
  );
  assert.equal(tiktokProgress[0]?.providerStatus, "INIT_REQUEST_SENT");
  assert.equal(tiktokProgress[0]?.externalId, null);
  assert.equal(tiktokProgress[1]?.externalId, "publish-1");
  assert.equal(tiktokResult.visibility, "followers");
  assert.equal(tiktokResult.providerVisibility, null);
  assert.equal(
    tiktokCalls.every(
      (call) =>
        new Headers(call.init?.headers).get("authorization") ===
        "Bearer secret-tiktok-token"
    ),
    true
  );

  const tiktokUtf16Boundary = "😀".repeat(1100);
  let tiktokBoundaryCall = 0;
  await publishProviderShort(
    {
      provider: "tiktok",
      config: tiktokConfig,
      accessToken: "token",
      account,
      media,
      caption: tiktokUtf16Boundary,
      tiktokSettings: {
        privacyLevel: "SELF_ONLY",
        allowComment: false,
        allowDuet: false,
        allowStitch: false,
        brandContent: false,
        brandOrganic: false,
      },
    },
    {
      fetch: async (_input, init) => {
        tiktokBoundaryCall += 1;
        if (tiktokBoundaryCall === 1) return tiktokCreator();
        if (tiktokBoundaryCall === 2) {
          const body = JSON.parse(String(init?.body));
          assert.equal(body.post_info.title, tiktokUtf16Boundary);
          return Response.json({
            data: { publish_id: "utf16-boundary" },
            error: { code: "ok" },
          });
        }
        return Response.json({
          data: { status: "PROCESSING_UPLOAD" },
          error: { code: "ok" },
        });
      },
    }
  );
  assert.equal(tiktokBoundaryCall, 3);
  let tiktokOverLimitCalls = 0;
  await assert.rejects(
    () =>
      publishProviderShort(
        {
          provider: "tiktok",
          config: tiktokConfig,
          accessToken: "token",
          account,
          media,
          caption: "😀".repeat(1101),
          tiktokSettings: {
            privacyLevel: "SELF_ONLY",
            allowComment: false,
            allowDuet: false,
            allowStitch: false,
            brandContent: false,
            brandOrganic: false,
          },
        },
        {
          fetch: async () => {
            tiktokOverLimitCalls += 1;
            return tiktokCreator();
          },
        }
      ),
    /2200 characters or fewer/
  );
  assert.equal(
    tiktokOverLimitCalls,
    1,
    "TikTok's UTF-16 limit rejects before the irreversible init request"
  );

  const unknownProgress: ProviderPublishProgress[] = [];
  await assert.rejects(
    () =>
      publishProviderShort(
        {
          provider: "tiktok",
          config: tiktokConfig,
          accessToken: "token",
          account,
          media,
          caption: "caption",
          tiktokSettings: {
            privacyLevel: "SELF_ONLY",
            allowComment: false,
            allowDuet: false,
            allowStitch: false,
            brandContent: false,
            brandOrganic: false,
          },
        },
        {
          fetch: async (input) => {
            if (String(input).includes("creator_info")) return tiktokCreator();
            throw new Error("lost response");
          },
          onProgress: async (progress) => {
            unknownProgress.push(progress);
          },
        }
      ),
    IntegrationPublicationAmbiguousError
  );

  const creatorStopCodes = [
    [
      "spam_risk_too_many_posts",
      /daily API post limit.*Use the TikTok app or try again later/,
    ],
    [
      "spam_risk_user_banned_from_posting",
      /currently blocked from posting.*Resolve the restriction in TikTok/,
    ],
    ["reached_active_user_cap", /daily active-creator limit.*Try again later/],
  ] as const;
  for (const [code, message] of creatorStopCodes) {
    await assert.rejects(
      () =>
        queryTikTokCreatorPublishingInfo("token", async () =>
          Response.json({ error: { code, message: "untrusted provider text" } })
        ),
      (error: unknown) =>
        error instanceof IntegrationPublicationTerminalError &&
        message.test(error.message) &&
        !error.message.includes("untrusted provider text")
    );
  }

  const cancelled = await queryTikTokPublishStatus(
    "token",
    "publish-id",
    async () =>
      Response.json({
        data: { status: "FAILED", fail_reason: "publish_cancelled" },
        error: { code: "ok" },
      })
  );
  assert.equal(cancelled.providerStatus, "FAILED:PUBLISH_CANCELLED");
  const spamText = await queryTikTokPublishStatus(
    "token",
    "publish-id",
    async () =>
      Response.json({
        data: { status: "FAILED", fail_reason: "spam_risk_text" },
        error: { code: "ok" },
      })
  );
  assert.equal(spamText.providerStatus, "FAILED:SPAM_RISK_TEXT");
  assert.deepEqual(
    unknownProgress.map((progress) => progress.providerStatus),
    ["INIT_REQUEST_SENT", "INIT_OUTCOME_UNKNOWN"]
  );

  const rejectedInitProgress: ProviderPublishProgress[] = [];
  await assert.rejects(
    () =>
      publishProviderShort(
        {
          provider: "tiktok",
          config: tiktokConfig,
          accessToken: "token",
          account,
          media,
          caption: "caption",
          tiktokSettings: {
            privacyLevel: "SELF_ONLY",
            allowComment: false,
            allowDuet: false,
            allowStitch: false,
            brandContent: false,
            brandOrganic: false,
          },
        },
        {
          fetch: async (input) =>
            String(input).includes("creator_info")
              ? tiktokCreator()
              : Response.json(
                  { error: { code: "access_token_invalid" } },
                  { status: 401 }
                ),
          onProgress: async (progress) => {
            rejectedInitProgress.push(progress);
          },
        }
      ),
    IntegrationProviderError
  );
  assert.deepEqual(
    rejectedInitProgress.map((progress) => progress.providerStatus),
    ["INIT_REQUEST_SENT"],
    "an explicit init rejection never crosses the provider acceptance boundary"
  );

  const acceptedThenUnauthorizedProgress: ProviderPublishProgress[] = [];
  let acceptedThenUnauthorizedCall = 0;
  await assert.rejects(
    () =>
      publishProviderShort(
        {
          provider: "tiktok",
          config: tiktokConfig,
          accessToken: "token",
          account,
          media,
          caption: "caption",
          tiktokSettings: {
            privacyLevel: "SELF_ONLY",
            allowComment: false,
            allowDuet: false,
            allowStitch: false,
            brandContent: false,
            brandOrganic: false,
          },
        },
        {
          fetch: async () => {
            acceptedThenUnauthorizedCall += 1;
            if (acceptedThenUnauthorizedCall === 1) return tiktokCreator();
            if (acceptedThenUnauthorizedCall === 2) {
              return Response.json({
                data: { publish_id: "accepted-id" },
                error: { code: "ok" },
              });
            }
            return Response.json(
              { error: { code: "access_token_invalid" } },
              { status: 401 }
            );
          },
          onProgress: async (progress) => {
            acceptedThenUnauthorizedProgress.push(progress);
          },
        }
      ),
    (error: unknown) =>
      error instanceof IntegrationPublicationAmbiguousError &&
      error.authorizationFailure
  );
  assert.deepEqual(
    acceptedThenUnauthorizedProgress.map((progress) => progress.providerStatus),
    ["INIT_REQUEST_SENT", "INITIALIZED"],
    "a durable publish id keeps the attempt reconcilable after authorization loss"
  );

  await assert.rejects(
    () =>
      publishProviderShort(
        {
          provider: "tiktok",
          config: tiktokConfig,
          accessToken: "token",
          account,
          media,
          caption: "caption",
          tiktokSettings: {
            privacyLevel: "SELF_ONLY",
            allowComment: false,
            allowDuet: false,
            allowStitch: false,
            brandContent: false,
            brandOrganic: false,
          },
        },
        {
          fetch: async (input) =>
            String(input).includes("creator_info")
              ? tiktokCreator()
              : Response.json({ error: "bad request" }, { status: 400 }),
        }
      ),
    IntegrationProviderError
  );

  const unapprovedConfig = getProviderOAuthConfig("tiktok", {
    ...env,
    TIKTOK_DIRECT_POST_APPROVAL_ACKNOWLEDGED: "false",
  })!;
  let unapprovedCalls = 0;
  await assert.rejects(
    () =>
      publishProviderShort(
        {
          provider: "tiktok",
          config: unapprovedConfig,
          accessToken: "token",
          account,
          media,
          caption: "caption",
          tiktokSettings: {
            privacyLevel: "PUBLIC_TO_EVERYONE",
            allowComment: false,
            allowDuet: false,
            allowStitch: false,
            brandContent: false,
            brandOrganic: false,
          },
        },
        {
          fetch: async () => {
            unapprovedCalls += 1;
            return tiktokCreator();
          },
        }
      ),
    /unavailable until an operator verifies TikTok's Direct Post approval/
  );
  assert.equal(unapprovedCalls, 1, "validation stops before irreversible init");

  await assert.rejects(
    () =>
      queryTikTokPublishStatus(
        "token",
        "publish-id",
        async () =>
          Response.json({
            data: { status: "FAILED", fail_reason: "auth_removed" },
            error: { code: "ok" },
          })
      ),
    (error: unknown) =>
      error instanceof IntegrationProviderError &&
      error.kind === "authorization"
  );

  const validInstagramProbe = {
    streams: [
      {
        codec_type: "video",
        codec_name: "h264",
        avg_frame_rate: "30/1",
        bit_rate: "8000000",
      },
      {
        codec_type: "audio",
        codec_name: "aac",
        sample_rate: "48000",
        bit_rate: "128000",
      },
    ],
  };
  assert.doesNotThrow(() => assertInstagramMediaProbe(validInstagramProbe));
  for (const [patch, message] of [
    [{ codec_name: "vp9" }, /H\.264 or HEVC/],
    [{ avg_frame_rate: "120/1" }, /between 23 and 60 fps/],
    [{ bit_rate: "25000001" }, /no higher than 25 Mbps/],
  ] as const) {
    assert.throws(
      () =>
        assertInstagramMediaProbe({
          streams: [
            { ...validInstagramProbe.streams[0], ...patch },
            validInstagramProbe.streams[1],
          ],
        }),
      message
    );
  }
  assert.throws(
    () =>
      assertInstagramMediaProbe({
        streams: [
          validInstagramProbe.streams[0],
          { ...validInstagramProbe.streams[1], codec_name: "opus" },
        ],
      }),
    /audio must use AAC/
  );
  assert.throws(
    () =>
      assertInstagramMediaProbe({
        streams: [
          validInstagramProbe.streams[0],
          { ...validInstagramProbe.streams[1], sample_rate: "44100" },
        ],
      }),
    /must use a 48 kHz sample rate/
  );
  assert.throws(
    () =>
      assertInstagramMediaProbe({
        streams: [
          validInstagramProbe.streams[0],
          { ...validInstagramProbe.streams[1], bit_rate: "128001" },
        ],
      }),
    /no higher than 128 kbps/
  );

  const literalProbePath = "/tmp/video;$(touch should-not-run).mp4";
  let observedProbe:
    | {
        executable: string;
        args: string[];
        options: { timeout: number; maxBuffer: number };
      }
    | undefined;
  await inspectInstagramReelMedia(literalProbePath, {
    executable: "/usr/bin/ffprobe",
    run: async (executable, args, options) => {
      observedProbe = { executable, args, options };
      return JSON.stringify(validInstagramProbe);
    },
  });
  assert.equal(observedProbe?.executable, "/usr/bin/ffprobe");
  assert.equal(observedProbe?.args.at(-1), literalProbePath);
  assert.deepEqual(Object.keys(observedProbe?.options ?? {}).sort(), [
    "maxBuffer",
    "timeout",
  ]);
  assert.equal(
    await instagramMediaProbeIsAvailable("/usr/bin/true"),
    false,
    "an arbitrary executable must not be advertised as ffprobe"
  );
  await assert.rejects(
    () =>
      inspectInstagramReelMedia("/tmp/unreadable.mp4", {
        run: async () => {
          throw new Error("ffprobe unavailable");
        },
      }),
    (error: unknown) =>
      error instanceof InstagramMediaProbeError &&
      /verify FFPROBE_PATH or regenerate/.test(error.message)
  );

  const instagramConfig = getProviderOAuthConfig("instagram", env)!;
  let rejectedInstagramNetworkCalls = 0;
  await assert.rejects(
    () =>
      publishProviderShort(
        {
          provider: "instagram",
          config: instagramConfig,
          accessToken: "token",
          account,
          media,
          caption: "caption",
        },
        {
          inspectInstagramMedia: async () => {
            throw new InstagramMediaProbeError(
              "Instagram Reels require H.264 or HEVC video; regenerate this asset"
            );
          },
          fetch: async () => {
            rejectedInstagramNetworkCalls += 1;
            return Response.json({ id: "must-not-exist" });
          },
        }
      ),
    (error: unknown) =>
      error instanceof IntegrationMediaValidationError &&
      /H\.264 or HEVC/.test(error.message)
  );
  assert.equal(
    rejectedInstagramNetworkCalls,
    0,
    "ffprobe rejection must happen before irreversible container creation"
  );
  const instagramProgress: ProviderPublishProgress[] = [];
  let instagramCall = 0;
  let instagramInspections = 0;
  await assert.rejects(
    () =>
      publishProviderShort(
        {
          provider: "instagram",
          config: instagramConfig,
          accessToken: "secret-instagram-token",
          account,
          media,
          caption: exactCaption,
        },
        {
          wait: async () => undefined,
          inspectInstagramMedia: async (localPath) => {
            instagramInspections += 1;
            assert.equal(localPath, media.localPath);
            assert.equal(
              instagramCall,
              0,
              "ffprobe validation must finish before container creation"
            );
          },
          fetch: async (input, init) => {
            instagramCall += 1;
            assert.equal(String(input).includes("secret-instagram-token"), false);
            assert.equal(
              new Headers(init?.headers).get("authorization"),
              "Bearer secret-instagram-token"
            );
            if (instagramCall === 1) {
              const body = init?.body as URLSearchParams;
              assert.equal(body.get("caption"), exactCaption);
              return Response.json({ id: "container-1" });
            }
            if (instagramCall === 2) {
              return Response.json({ status_code: "FINISHED" });
            }
            throw new Error("publish response lost");
          },
          onProgress: async (progress) => {
            instagramProgress.push(progress);
          },
        }
      ),
    IntegrationPublicationAmbiguousError
  );
  assert.equal(instagramProgress.at(-1)?.providerStatus, "PUBLISH_OUTCOME_UNKNOWN");
  assert.equal(instagramCall, 3, "media_publish is attempted only once");
  assert.equal(instagramInspections, 1);

  const instagramMissingIdProgress: ProviderPublishProgress[] = [];
  let instagramMissingIdCall = 0;
  await assert.rejects(
    () =>
      publishProviderShort(
        {
          provider: "instagram",
          config: instagramConfig,
          accessToken: "token",
          account,
          media,
          caption: "caption",
        },
        {
          wait: async () => undefined,
          inspectInstagramMedia: async () => undefined,
          fetch: async () => {
            instagramMissingIdCall += 1;
            if (instagramMissingIdCall === 1) {
              return Response.json({ id: "container-missing-id" });
            }
            if (instagramMissingIdCall === 2) {
              return Response.json({ status_code: "FINISHED" });
            }
            return Response.json({}, { status: 200 });
          },
          onProgress: async (progress) => {
            instagramMissingIdProgress.push(progress);
          },
        }
      ),
    IntegrationPublicationAmbiguousError
  );
  assert.equal(
    instagramMissingIdProgress.at(-1)?.providerStatus,
    "PUBLISH_OUTCOME_UNKNOWN",
    "Instagram 2xx without an id remains locked against duplicate publishing"
  );

  const youtubeConfig = getProviderOAuthConfig("youtube", env)!;
  await assert.rejects(
    () =>
      publishProviderShort(
        {
          provider: "youtube",
          config: youtubeConfig,
          accessToken: "token",
          account,
          media: { ...media, publicUrl: undefined },
          caption: "unused",
          youtubeSettings: {
            title: "Title",
            description: "Description",
            privacyStatus: "private",
            selfDeclaredMadeForKids: false,
            audienceConfirmed: false,
            communityGuidelinesConfirmed: true,
          },
        },
        { fetch: async () => new Response(null, { status: 500 }) }
      ),
    IntegrationMediaValidationError
  );
  const youtubeCalls: Array<{ url: string; init?: RequestInit }> = [];
  const youtubeProgress: ProviderPublishProgress[] = [];
  const youtubeResult = await publishProviderShort(
    {
      provider: "youtube",
      config: youtubeConfig,
      accessToken: "secret-youtube-token",
      account,
      media: { ...media, publicUrl: undefined },
      caption: "unused",
      youtubeSettings: {
        title: "  Exact title  ",
        description: exactCaption,
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
        audienceConfirmed: true,
        communityGuidelinesConfirmed: true,
      },
    },
    {
      fetch: async (input, init) => {
        const url = String(input);
        youtubeCalls.push({ url, init });
        if (url.includes("uploadType=resumable")) {
          const body = JSON.parse(String(init?.body));
          assert.equal(body.status.privacyStatus, "public");
          assert.equal(body.status.containsSyntheticMedia, true);
          assert.equal(body.status.selfDeclaredMadeForKids, false);
          assert.equal(body.snippet.title, "  Exact title  ");
          assert.equal(body.snippet.description, exactCaption);
          return new Response(null, {
            status: 200,
            headers: { location: "https://www.googleapis.com/upload/session-1" },
          });
        }
        if (init?.headers && new Headers(init.headers).get("content-length") === "0") {
          return new Response(null, { status: 308 });
        }
        return Response.json(
          { id: "youtube-1", status: { privacyStatus: "private" } },
          { status: 201 }
        );
      },
      onRecoverySession: async (url) => {
        assert.equal(url, "https://www.googleapis.com/upload/session-1");
      },
      onProgress: async (progress) => {
        youtubeProgress.push(progress);
      },
    }
  );
  assert.equal(youtubeResult.visibility, "private");
  assert.equal(youtubeResult.providerVisibility, "private");
  assert.equal(youtubeProgress.at(-1)?.externalId, "youtube-1");
  assert.equal(
    youtubeCalls.every((call) => !call.url.includes("secret-youtube-token")),
    true
  );

  let youtubeUnicodeCalls = 0;
  await publishProviderShort(
    {
      provider: "youtube",
      config: youtubeConfig,
      accessToken: "token",
      account,
      media: { ...media, publicUrl: undefined },
      caption: "unused",
      youtubeSettings: {
        title: "😀".repeat(100),
        description: "Description",
        privacyStatus: "private",
        selfDeclaredMadeForKids: false,
        audienceConfirmed: true,
        communityGuidelinesConfirmed: true,
      },
    },
    {
      fetch: async (input, init) => {
        youtubeUnicodeCalls += 1;
        if (String(input).includes("uploadType=resumable")) {
          const body = JSON.parse(String(init?.body));
          assert.equal(body.snippet.title, "😀".repeat(100));
          return new Response(null, {
            status: 200,
            headers: {
              location: "https://www.googleapis.com/upload/unicode-session",
            },
          });
        }
        if (new Headers(init?.headers).get("content-length") === "0") {
          return new Response(null, { status: 308 });
        }
        return Response.json(
          { id: "unicode-video", status: { privacyStatus: "private" } },
          { status: 201 }
        );
      },
      onRecoverySession: async () => undefined,
    }
  );
  assert.equal(youtubeUnicodeCalls, 3);
  let youtubeOverLimitCalls = 0;
  await assert.rejects(
    () =>
      publishProviderShort(
        {
          provider: "youtube",
          config: youtubeConfig,
          accessToken: "token",
          account,
          media: { ...media, publicUrl: undefined },
          caption: "unused",
          youtubeSettings: {
            title: "😀".repeat(101),
            description: "Description",
            privacyStatus: "private",
            selfDeclaredMadeForKids: false,
            audienceConfirmed: true,
            communityGuidelinesConfirmed: true,
          },
        },
        {
          fetch: async () => {
            youtubeOverLimitCalls += 1;
            return new Response(null, { status: 500 });
          },
        }
      ),
    /100 characters or fewer/
  );
  assert.equal(youtubeOverLimitCalls, 0);

  for (const malformedSuccess of [
    Response.json({}, { status: 201 }),
    new Response("{", {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  ]) {
    const malformedProgress: ProviderPublishProgress[] = [];
    let malformedCall = 0;
    await assert.rejects(
      () =>
        publishProviderShort(
          {
            provider: "youtube",
            config: youtubeConfig,
            accessToken: "token",
            account,
            media: { ...media, publicUrl: undefined },
            caption: "unused",
            youtubeSettings: {
              title: "Title",
              description: "Description",
              privacyStatus: "private",
              selfDeclaredMadeForKids: true,
              audienceConfirmed: true,
              communityGuidelinesConfirmed: true,
            },
          },
          {
            fetch: async (input, init) => {
              malformedCall += 1;
              if (String(input).includes("uploadType=resumable")) {
                return new Response(null, {
                  status: 200,
                  headers: {
                    location: "https://www.googleapis.com/upload/malformed",
                  },
                });
              }
              if (
                new Headers(init?.headers).get("content-length") === "0"
              ) {
                return new Response(null, { status: 308 });
              }
              return malformedSuccess.clone();
            },
            onRecoverySession: async () => undefined,
            onProgress: async (progress) => {
              malformedProgress.push(progress);
            },
          }
        ),
      IntegrationPublicationAmbiguousError
    );
    assert.equal(malformedCall, 3);
    assert.equal(
      malformedProgress.at(-1)?.providerStatus,
      "UPLOAD_OUTCOME_UNKNOWN",
      "YouTube 201 without a usable id remains locked against duplicate upload"
    );
  }

  const expiredUnknownProgress: ProviderPublishProgress[] = [];
  await assert.rejects(
    () =>
      resumeYouTubeUpload(
        {
          uploadUrl: "https://www.googleapis.com/upload/expired-session",
          accessToken: "token",
          media: { ...media, publicUrl: undefined },
          visibility: "private",
          priorOutcomeUnknown: true,
        },
        {
          fetch: async () => new Response(null, { status: 404 }),
          onProgress: async (progress) => {
            expiredUnknownProgress.push(progress);
          },
        }
      ),
    (error: unknown) =>
      error instanceof IntegrationPublicationAmbiguousError &&
      /session expired.*does not prove that no video was created/i.test(
        error.message
      )
  );
  assert.equal(
    expiredUnknownProgress.at(-1)?.providerStatus,
    "UPLOAD_OUTCOME_UNKNOWN",
    "an expired recovery session cannot unlock retry after an unknown success"
  );

  const lostUploadThenExpiredProgress: ProviderPublishProgress[] = [];
  let lostUploadThenExpiredCall = 0;
  await assert.rejects(
    () =>
      resumeYouTubeUpload(
        {
          uploadUrl: "https://www.googleapis.com/upload/lost-then-expired",
          accessToken: "token",
          media: { ...media, publicUrl: undefined },
          visibility: "private",
        },
        {
          wait: async () => undefined,
          fetch: async () => {
            lostUploadThenExpiredCall += 1;
            if (lostUploadThenExpiredCall === 1) {
              return new Response(null, { status: 308 });
            }
            if (lostUploadThenExpiredCall === 2) {
              throw new Error("201 response lost after bytes were sent");
            }
            return new Response(null, { status: 404 });
          },
          onProgress: async (progress) => {
            lostUploadThenExpiredProgress.push(progress);
          },
        }
      ),
    IntegrationPublicationAmbiguousError
  );
  assert.deepEqual(
    lostUploadThenExpiredProgress.map((progress) => progress.providerStatus),
    ["UPLOAD_REQUEST_SENT", "UPLOAD_OUTCOME_UNKNOWN"],
    "a lost final response followed by session expiry never unlocks a new upload"
  );

  const deleted = await queryYouTubePublishStatus(
    "token",
    "youtube-1",
    async () =>
      Response.json({
        items: [
          {
            status: { uploadStatus: "deleted", privacyStatus: "private" },
            processingDetails: { processingStatus: "terminated" },
          },
        ],
      })
  );
  assert.equal(deleted.status, "failed");
  assert.equal(deleted.visibility, "private");

  const now = Date.parse("2026-08-03T12:00:00.000Z");
  assert.equal(parseRetryAfterMilliseconds("2", now), 2000);
  assert.equal(
    parseRetryAfterMilliseconds("Sun, 03 Aug 2026 12:00:04 GMT", now),
    4000
  );
  assert.equal(parseRetryAfterMilliseconds("invalid", now), null);
  assert.deepEqual(
    [500, 501, 502, 503, 504, 505].filter(
      youtubeResumableStatusIsRetryable
    ),
    [500, 502, 503, 504],
    "YouTube resumable HTTP retries use the documented transient allowlist"
  );

  let nonRetryableProbeCalls = 0;
  let nonRetryableProbeWaits = 0;
  await assert.rejects(
    () =>
      resumeYouTubeUpload(
        {
          uploadUrl: "https://www.googleapis.com/upload/non-retryable-probe",
          accessToken: "token",
          media: { ...media, publicUrl: undefined },
          visibility: "private",
        },
        {
          fetch: async () => {
            nonRetryableProbeCalls += 1;
            return new Response(null, { status: 501 });
          },
          wait: async () => {
            nonRetryableProbeWaits += 1;
          },
        }
      ),
    IntegrationPublicationTerminalError
  );
  assert.equal(nonRetryableProbeCalls, 1);
  assert.equal(nonRetryableProbeWaits, 0);

  let nonRetryableUploadCalls = 0;
  let nonRetryableUploadWaits = 0;
  await assert.rejects(
    () =>
      resumeYouTubeUpload(
        {
          uploadUrl: "https://www.googleapis.com/upload/non-retryable-upload",
          accessToken: "token",
          media: { ...media, publicUrl: undefined },
          visibility: "private",
        },
        {
          fetch: async () => {
            nonRetryableUploadCalls += 1;
            return new Response(null, {
              status: nonRetryableUploadCalls === 1 ? 308 : 501,
            });
          },
          wait: async () => {
            nonRetryableUploadWaits += 1;
          },
        }
      ),
    IntegrationPublicationTerminalError
  );
  assert.equal(nonRetryableUploadCalls, 2);
  assert.equal(nonRetryableUploadWaits, 0);

  assert.equal(
    JSON.stringify({ tiktokResult, youtubeResult }).includes("secret-"),
    false
  );
  assert.ok(IntegrationPublicationTerminalError);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
