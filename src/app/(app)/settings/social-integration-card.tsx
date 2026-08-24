"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ExternalLink,
  Loader2,
  Plug,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import type {
  ConnectedIntegrationAccountStatus,
  PublicIntegrationStatus,
  SocialProvider,
} from "@/lib/integrations-client";
import { cn } from "@/lib/utils";

export type SocialIntegrationCardModel = {
  provider: SocialProvider;
  status: PublicIntegrationStatus | null;
  loading: boolean;
  busy: boolean;
  onConnect: (
    status: PublicIntegrationStatus,
    acceptPolicies?: boolean
  ) => void;
  onSync: (status: PublicIntegrationStatus, accountId: string) => void;
  onDisconnect: (status: PublicIntegrationStatus, accountId: string) => void;
};

export function SocialIntegrationCard({ card }: { card: SocialIntegrationCardModel }) {
  const {
    provider,
    status,
    loading,
    busy,
    onConnect,
    onSync,
    onDisconnect,
  } = card;
  const [youtubePolicyConsent, setYouTubePolicyConsent] = useState(false);
  const content = PROVIDER_CONTENT[provider];
  const displayName = status?.displayName ?? provider[0].toUpperCase() + provider.slice(1);
  const notConfigured = status?.configuration === "not_configured";
  const connected = Boolean(status?.connected && status.accounts.length > 0);
  const unavailable = !loading && !status;
  const youtubeCompliance = status?.youtubeCompliance;
  const youtubeOAuthNeedsConsent =
    provider === "youtube" &&
    status?.configuration === "ready" &&
    (!connected || status.accounts.some((account) => account.authorization.status !== "healthy"));
  const canStartOAuth =
    provider !== "youtube" ||
    (Boolean(youtubeCompliance) && youtubePolicyConsent);

  return (
    <article data-social-provider={provider} className="pf-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SocialProviderIcon provider={provider} label={`${displayName} logo`} className="size-9 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{displayName}</h3>
            <p className="mt-0.5 whitespace-nowrap text-[12px] text-muted-foreground">{status?.connected ? `${status.accounts.length} connected` : "No account connected"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && !status ? (
            <span className="h-5 w-20 animate-pulse rounded-full bg-[var(--pf-active)]" />
          ) : (
            <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]", unavailable ? "border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]" : connected ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]" : "border-border bg-[var(--pf-active)] text-muted-foreground")}>
              {unavailable ? "Status unavailable" : connected ? "Connected" : notConfigured ? "Not configured" : "Ready to connect"}
            </span>
          )}
          {status?.configuration === "ready" && !loading && status.connected && (
            <button type="button" onClick={() => onConnect(status, youtubePolicyConsent)} disabled={busy || !canStartOAuth} className="pf-button-secondary h-8 px-2.5 text-[12px]" title={`Connect another ${displayName} account`}>
              <Plug className="size-3" /> Connect another
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 max-w-[560px] text-[12px] leading-4 text-muted-foreground">{content.description}</p>

      {status?.connected && status.accounts.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {status.accounts.map((account) => (
            <AccountRow
              key={account.account.id}
              providerStatus={status}
              displayName={displayName}
              account={account}
              busy={busy}
              onSync={onSync}
              onDisconnect={onDisconnect}
              onReconnect={() =>
                onConnect(
                  {
                    ...status,
                    connected: false,
                    accounts: [],
                    accountCount: 0,
                  },
                  youtubePolicyConsent
                )
              }
              canStartOAuth={canStartOAuth}
            />
          ))}
        </div>
      ) : notConfigured ? (
        <div className="mt-3 rounded-lg border border-dashed border-border bg-card p-2.5">
          <b className="block text-[12px] text-muted-foreground">Server setup required</b>
          <p data-settings-setup="true" className="mt-1 min-w-0 break-words text-[11px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">{content.setup}</p>
          <Link href={content.documentation} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--pf-link)]">Setup documentation <ExternalLink className="size-2.5" /></Link>
          {content.policyLinks && (
            <div className="mt-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1">
              {content.policyLinks.map((link) => (
                <Link key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 break-words text-[11px] font-semibold text-[var(--pf-link)] [overflow-wrap:anywhere]">
                  {link.label} <ExternalLink className="size-2.5 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : unavailable ? (
        <p className="mt-3 min-w-0 break-words rounded-lg border border-dashed border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 p-2.5 text-[11px] leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere]">The integration service did not return this provider. Refresh status before attempting a connection.</p>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-border bg-card p-2.5 text-[11px] leading-4 text-muted-foreground">OAuth is configured, but no account is connected to this workspace.</p>
      )}

      {content.policyLinks && !notConfigured && (
        <div className="mt-3 flex min-w-0 flex-wrap gap-x-3 gap-y-1">
          {content.policyLinks.map((link) => (
            <Link key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 break-words text-[11px] font-semibold text-[var(--pf-link)] [overflow-wrap:anywhere]">
              {link.label} <ExternalLink className="size-2.5 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {provider === "youtube" && youtubeCompliance && (
        <div data-youtube-owner-policies className="mt-3 rounded-lg border border-[var(--pf-link)]/30 bg-[var(--pf-link)]/10 p-2.5">
          <b className="block text-[12px] text-[var(--pf-link)]">
            PostForge policies for YouTube API Services
          </b>
          <div className="mt-1.5 flex min-w-0 flex-wrap gap-x-3 gap-y-1">
            {[
              ["Privacy Policy", youtubeCompliance.privacyPolicyUrl],
              ["Terms", youtubeCompliance.termsUrl],
              ["Data deletion", youtubeCompliance.dataDeletionUrl],
            ].map(([label, href]) => (
              <Link key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 break-words text-[11px] font-semibold text-[var(--pf-link)] [overflow-wrap:anywhere]">
                {label} <ExternalLink className="size-2.5 shrink-0" />
              </Link>
            ))}
          </div>
          {youtubeOAuthNeedsConsent && (
            <label className="mt-2 flex cursor-pointer items-start gap-2 border-t border-[var(--pf-link)]/30 pt-2 text-[11px] leading-4 text-[var(--pf-link)]">
              <input
                type="checkbox"
                aria-label="Accept policies before connecting YouTube"
                checked={youtubePolicyConsent}
                disabled={busy}
                onChange={(event) =>
                  setYouTubePolicyConsent(event.currentTarget.checked)
                }
                className="mt-0.5 size-3 shrink-0 accent-[var(--pf-orange)]"
              />
              <span>
                I have reviewed and accept PostForge&apos;s Privacy Policy and
                Terms. I also agree that using YouTube API Services means
                accepting YouTube&apos;s Terms of Service.
              </span>
            </label>
          )}
        </div>
      )}

      {!status?.connected && (
        <div className="mt-3 flex">
          <button type="button" onClick={() => status && onConnect(status, youtubePolicyConsent)} disabled={!status || status.configuration !== "ready" || !status.connectUrl || loading || busy || !canStartOAuth} className={cn("h-9 w-full rounded-lg text-[13px] font-semibold", status?.configuration === "ready" && status.connectUrl && canStartOAuth ? "bg-foreground text-white hover:bg-black" : "cursor-not-allowed bg-[var(--pf-active)] text-muted-foreground")}>
            {loading && !status ? "Checking configuration…" : notConfigured ? "Setup required" : unavailable ? "Status unavailable" : status?.connectUrl ? `Connect ${displayName}` : "Connect endpoint unavailable"}
          </button>
        </div>
      )}
    </article>
  );
}

const PROVIDER_CONTENT: Record<
  SocialProvider,
  {
    description: string;
    setup: string;
    documentation: string;
    policyLinks?: Array<{ label: string; href: string }>;
  }
> = {
  tiktok: {
    description: "Read owned-post performance and explicitly publish an approved Gallery video after provider review.",
    setup: "Set server credentials and a public HTTPS POSTFORGE_PUBLIC_URL. Verify that domain or URL prefix in TikTok's developer portal and obtain video.publish approval; OAuth configuration alone is not sufficient.",
    documentation: "https://developers.tiktok.com/doc/login-kit-overview",
  },
  instagram: {
    description: "Read owned Reels and explicitly publish an approved Gallery video after provider review.",
    setup: "Set server credentials, a public HTTPS POSTFORGE_PUBLIC_URL reachable by Meta's crawler, and grant instagram_business_content_publish.",
    documentation: "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login",
  },
  youtube: {
    description: "Read channel-owned metrics and explicitly upload an approved vertical video with editable metadata and privacy.",
    setup: "Publish your own Privacy Policy, Terms, and data-deletion instructions at public HTTPS URLs; set POSTFORGE_PRIVACY_POLICY_URL, POSTFORGE_TERMS_URL, POSTFORGE_DATA_DELETION_URL, and a strong CRON_SECRET for the daily provider-data retention job; configure the same disclosures on the Google OAuth consent screen; enable the YouTube Data API; grant youtube.upload; and complete any required Google verification. PostForge validates URL and retention-worker readiness only: it does not create legal disclosures, attest their contents, or claim provider approval.",
    documentation: "https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps",
    policyLinks: [
      {
        label: "YouTube Terms",
        href: "https://www.youtube.com/t/terms",
      },
      {
        label: "YouTube Community Guidelines",
        href: "https://www.youtube.com/howyoutubeworks/policies/community-guidelines/",
      },
      {
        label: "YouTube API Services Terms",
        href: "https://developers.google.com/youtube/terms/api-services-terms-of-service",
      },
      {
        label: "Google Privacy Policy",
        href: "https://policies.google.com/privacy",
      },
      {
        label: "Revoke Google access",
        href: "https://myaccount.google.com/permissions",
      },
    ],
  },
};

function AccountRow({
  providerStatus,
  displayName,
  account,
  busy,
  onSync,
  onDisconnect,
  onReconnect,
  canStartOAuth,
}: {
  providerStatus: PublicIntegrationStatus;
  displayName: string;
  account: ConnectedIntegrationAccountStatus;
  busy: boolean;
  onSync: (status: PublicIntegrationStatus, accountId: string) => void;
  onDisconnect: (status: PublicIntegrationStatus, accountId: string) => void;
  onReconnect: () => void;
  canStartOAuth: boolean;
}) {
  const { account: info } = account;
  const accountName = info.displayName || info.username || `${displayName} account`;
  const accountUsername = info.username
    ? info.username.startsWith("@")
      ? info.username
      : `@${info.username}`
    : "Username unavailable";
  const authorizationRequired = account.authorization.status !== "healthy";
  const syncTone = authorizationRequired || account.sync.status === "error"
    ? "border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
    : account.sync.status === "partial"
      ? "border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10 text-[var(--pf-lamp-amber)]"
      : account.sync.status === "ready"
        ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
        : "border-border bg-[var(--pf-active)] text-muted-foreground";
  const syncLabel = authorizationRequired
    ? "Reconnect required"
    : account.sync.status === "error"
      ? "Sync error"
      : account.sync.status === "partial"
        ? "Partially synced"
        : account.sync.status === "ready"
          ? "Ready"
          : "Not synced";
  return (
    <div className="grid min-w-0 gap-2 rounded-lg border border-border bg-card p-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-[12px] font-bold text-white">
          {accountName.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[11px]">{accountName}</b>
          <small className="mt-0.5 block truncate text-[11px] text-muted-foreground">{accountUsername}</small>
        </span>
        {info.profileUrl && <Link href={info.profileUrl} target="_blank" rel="noreferrer" aria-label={`Open ${displayName} profile`} className="grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-white"><ExternalLink className="size-3" /></Link>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap gap-1">
          {(["metrics", "publish"] as const).map((capability) => (
            <span key={capability} className={cn("rounded-full border px-1.5 py-0.5 text-[11px] font-semibold", account.capabilities[capability] ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]" : "border-border bg-white text-muted-foreground")}>
              {capability === "metrics" ? "Metrics" : account.publishingUnavailableReason ? "Upload runtime" : "Upload scope"} {account.capabilities[capability] ? "verified" : capability === "publish" && account.publishingUnavailableReason ? "unavailable" : "not granted"}
            </span>
          ))}
        </div>
        <span className={cn("rounded-full border px-1.5 py-0.5 text-[11px] font-semibold", syncTone)}>{syncLabel}</span>
        {authorizationRequired && <span className="rounded-full border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--pf-danger)]">Authorization required</span>}
      </div>
      {account.sync.status === "ready" && account.sync.lastSuccessfulAt && (
        <p className="min-w-0 break-words text-[11px] leading-4 text-muted-foreground [overflow-wrap:anywhere] lg:col-span-2">
          Last synced <time dateTime={account.sync.lastSuccessfulAt}>{formatConnectionDate(account.sync.lastSuccessfulAt)}</time>
        </p>
      )}
      {account.publishingUnavailableReason && (
        <p className="min-w-0 break-words text-[11px] leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere] lg:col-span-2">{account.publishingUnavailableReason}</p>
      )}
      {account.sync.status === "error" && account.sync.warnings[0] && (
        <p className="min-w-0 break-words text-[11px] leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere] lg:col-span-2">{account.sync.warnings[0]}</p>
      )}
      <div className="flex flex-wrap gap-1.5 lg:col-span-2">
        <button type="button" onClick={() => authorizationRequired ? onReconnect() : onSync(providerStatus, account.account.id)} disabled={busy || (authorizationRequired && !canStartOAuth)} className="pf-button-secondary h-7 px-2.5 text-[12px]">
          {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} {authorizationRequired ? "Reconnect" : "Sync"}
        </button>
        <button type="button" onClick={() => onDisconnect(providerStatus, account.account.id)} disabled={busy} className="pf-button-secondary h-7 px-2.5 text-[12px] text-[var(--pf-danger)]">
          <Unplug className="size-3" /> Disconnect
        </button>
      </div>
    </div>
  );
}

function formatConnectionDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "at an unknown time";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
