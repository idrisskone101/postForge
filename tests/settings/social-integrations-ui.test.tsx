import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  IntegrationsPanel,
  readIntegrationCallbackFeedback,
  SettingsNavigation,
  SocialIntegrationCard,
} from "../../src/app/settings/settings-page-client";
import type { PublicIntegrationStatus } from "../../src/lib/integrations/types";

const noOp = () => {};

function status(
  overrides: Partial<PublicIntegrationStatus> &
    Pick<PublicIntegrationStatus, "provider" | "displayName">
): PublicIntegrationStatus {
  const { provider, displayName, ...rest } = overrides;
  return {
    provider,
    displayName,
    configuration: "ready",
    connected: false,
    accountCount: 0,
    accounts: [],
    youtubeCompliance: null,
    connectUrl: `/api/integrations/${provider}/connect`,
    ...rest,
  };
}

function connected(
  provider: "tiktok" | "instagram" | "youtube",
  account: PublicIntegrationStatus["accounts"][number]["account"],
  patch: Partial<PublicIntegrationStatus["accounts"][number]> = {}
): PublicIntegrationStatus {
  return status({
    provider,
    displayName:
      provider === "tiktok"
        ? "TikTok"
        : provider === "instagram"
          ? "Instagram"
          : "YouTube",
    connected: true,
    accountCount: 1,
    accounts: [
      {
        account,
        grantedScopes: [],
        capabilities: {
          profile: false,
          ownedMedia: false,
          metrics: false,
          publish: false,
        },
        connectedAt: null,
        updatedAt: null,
        authorization: { status: "healthy", lastCheckedAt: null },
        sync: {
          status: "never",
          lastAttemptAt: null,
          lastSuccessfulAt: null,
          warnings: [],
        },
        publishingUnavailableReason: null,
        ...patch,
      },
    ],
  });
}

const notConfiguredInstagram = status({
  provider: "instagram",
  displayName: "Instagram",
  configuration: "not_configured",
});

const connectedTikTok = connected(
  "tiktok",
  {
    id: "tt-1",
    username: "real_creator",
    displayName: "Real Creator",
    avatarUrl: null,
    profileUrl: "https://www.tiktok.com/@real_creator",
  },
  {
    grantedScopes: ["user.info.basic", "video.list"],
    capabilities: {
      profile: true,
      ownedMedia: true,
      metrics: true,
      publish: false,
    },
    connectedAt: "2026-08-03T12:00:00.000Z",
    updatedAt: "2026-08-03T12:02:00.000Z",
    sync: {
      status: "error",
      lastAttemptAt: "2026-08-03T12:03:00.000Z",
      lastSuccessfulAt: "2026-08-03T12:02:00.000Z",
      warnings: ["The latest provider sync failed; previously stored metrics were kept."],
    },
  }
);

const readyYouTube = status({
  provider: "youtube",
  displayName: "YouTube",
  youtubeCompliance: {
    privacyPolicyUrl: "https://postforge.example/privacy",
    termsUrl: "https://postforge.example/terms",
    dataDeletionUrl: "https://postforge.example/data-deletion",
    youtubeTermsOfServiceUrl: "https://www.youtube.com/t/terms",
    consentAccepted: false,
    acceptedAt: null,
  },
});

const notConfiguredYouTube = status({
  provider: "youtube",
  displayName: "YouTube",
  configuration: "not_configured",
});

const instagramMarkup = renderToStaticMarkup(
  <SocialIntegrationCard
    provider="instagram"
    status={notConfiguredInstagram}
    loading={false}
    busy={false}
    onConnect={noOp}
    onSync={noOp}
    onDisconnect={noOp}
  />
);
assert.match(instagramMarkup, /data-social-provider="instagram"/);
assert.match(instagramMarkup, /aria-label="Instagram logo"/);
assert.match(instagramMarkup, /Not configured/);
assert.match(instagramMarkup, /POSTFORGE_PUBLIC_URL/);
assert.match(instagramMarkup, /Meta.*crawler/);
assert.match(instagramMarkup, /instagram_business_content_publish/);
assert.match(instagramMarkup, /Setup required/);
assert.match(instagramMarkup, /disabled=""/);

const connectedMarkup = renderToStaticMarkup(
  <SocialIntegrationCard
    provider="tiktok"
    status={connectedTikTok}
    loading={false}
    busy={false}
    onConnect={noOp}
    onSync={noOp}
    onDisconnect={noOp}
  />
);
assert.match(connectedMarkup, /data-social-provider="tiktok"/);
assert.match(connectedMarkup, /Real Creator/);
assert.match(connectedMarkup, /@real_creator/);
assert.match(connectedMarkup, /Sync error/);
assert.match(connectedMarkup, /Metrics verified/);
assert.match(connectedMarkup, /Upload scope not granted/);
assert.match(connectedMarkup, /> Sync</);
assert.match(connectedMarkup, /> Disconnect</);
assert.doesNotMatch(connectedMarkup, /Connect TikTok/);

const instagramRuntimeUnavailableMarkup = renderToStaticMarkup(
  <SocialIntegrationCard
    provider="instagram"
    status={connected(
      "instagram",
      {
        id: "instagram-account",
        username: "creator",
        displayName: "Creator",
        avatarUrl: null,
        profileUrl: null,
      },
      {
        publishingUnavailableReason:
          "Instagram publishing requires an executable FFPROBE_PATH on the server before media can be verified.",
      }
    )}
    loading={false}
    busy={false}
    onConnect={noOp}
    onSync={noOp}
    onDisconnect={noOp}
  />
);
assert.match(instagramRuntimeUnavailableMarkup, /Upload runtime/);
assert.match(instagramRuntimeUnavailableMarkup, /unavailable/);
assert.match(instagramRuntimeUnavailableMarkup, /FFPROBE_PATH/);

const youtubeMarkup = renderToStaticMarkup(
  <SocialIntegrationCard
    provider="youtube"
    status={readyYouTube}
    loading={false}
    busy={false}
    onConnect={noOp}
    onSync={noOp}
    onDisconnect={noOp}
  />
);
assert.match(youtubeMarkup, />YouTube</);
assert.match(youtubeMarkup, /Connect YouTube/);
assert.match(youtubeMarkup, /PostForge policies for YouTube API Services/);
assert.match(youtubeMarkup, /https:\/\/postforge\.example\/privacy/);
assert.match(youtubeMarkup, /https:\/\/postforge\.example\/terms/);
assert.match(youtubeMarkup, /https:\/\/postforge\.example\/data-deletion/);
assert.match(youtubeMarkup, /Accept policies before connecting YouTube/);
assert.match(youtubeMarkup, /using YouTube API Services means/);
assert.match(youtubeMarkup, /<button[^>]*disabled=""[^>]*>Connect YouTube<\/button>/);
assert.doesNotMatch(youtubeMarkup, /type="checkbox"[^>]*checked/);

const youtubeSetupMarkup = renderToStaticMarkup(
  <SocialIntegrationCard
    provider="youtube"
    status={notConfiguredYouTube}
    loading={false}
    busy={false}
    onConnect={noOp}
    onSync={noOp}
    onDisconnect={noOp}
  />
);
assert.match(youtubeSetupMarkup, /POSTFORGE_PRIVACY_POLICY_URL/);
assert.match(youtubeSetupMarkup, /POSTFORGE_TERMS_URL/);
assert.match(youtubeSetupMarkup, /POSTFORGE_DATA_DELETION_URL/);
assert.match(youtubeSetupMarkup, /CRON_SECRET/);
assert.match(youtubeSetupMarkup, /YouTube API Services Terms/);
assert.match(youtubeSetupMarkup, /YouTube Terms/);
assert.match(youtubeSetupMarkup, /YouTube Community Guidelines/);
assert.match(youtubeSetupMarkup, /Google Privacy Policy/);
assert.match(youtubeSetupMarkup, /Revoke Google access/);
assert.match(youtubeSetupMarkup, /does not create legal disclosures/);

const connectedYouTubeMarkup = renderToStaticMarkup(
  <SocialIntegrationCard
    provider="youtube"
    status={{
      ...readyYouTube,
      ...connected("youtube", {
        id: "youtube-account",
        username: "@channel",
        displayName: "Channel",
        avatarUrl: null,
        profileUrl: "https://www.youtube.com/channel/youtube-account",
      }),
    }}
    loading={false}
    busy={false}
    onConnect={noOp}
    onSync={noOp}
    onDisconnect={noOp}
  />
);
assert.match(connectedYouTubeMarkup, /Revoke Google access/);

const panelMarkup = renderToStaticMarkup(
  <IntegrationsPanel
    providers={[connectedTikTok, notConfiguredInstagram, readyYouTube]}
    loading={false}
    error={null}
    busyProvider={null}
    onRefresh={noOp}
    onConnect={noOp}
    onSync={noOp}
    onDisconnect={noOp}
    onOpenWebhooks={noOp}
  />
);
assert.match(panelMarkup, /Refresh status/);
assert.equal((panelMarkup.match(/data-social-provider=/g) ?? []).length, 3);
assert.match(panelMarkup, /Social accounts/);
assert.match(panelMarkup, /Connect another/);

const navigationMarkup = renderToStaticMarkup(
  <SettingsNavigation
    tab="integrations"
    connectedIntegrations={2}
    onSelect={noOp}
  />
);
assert.match(navigationMarkup, /2 connected integrations/);

assert.deepEqual(
  readIntegrationCallbackFeedback(
    new URLSearchParams("provider=tiktok&connected=1")
  ),
  {
    tone: "success",
    message: "TikTok authorization returned. Confirming the server connection.",
    provider: "tiktok",
  }
);
assert.deepEqual(
  readIntegrationCallbackFeedback(
    new URLSearchParams("provider=instagram&integration_error=oauth_denied")
  ),
  {
    tone: "error",
    message: "Instagram connection failed: authorization was denied",
    provider: "instagram",
  }
);
assert.deepEqual(
  readIntegrationCallbackFeedback(
    new URLSearchParams(
      "provider=youtube&integration_error=%3Cscript%3Ealert(1)%3C%2Fscript%3E"
    )
  ),
  {
    tone: "error",
    message:
      "YouTube connection failed: an unknown connection error occurred",
    provider: "youtube",
  }
);
assert.equal(
  readIntegrationCallbackFeedback(new URLSearchParams("connected=1")),
  null,
  "A success flag without a known provider must never create a success toast"
);

console.log("Social integrations UI checks passed");
