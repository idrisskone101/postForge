"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Plug } from "lucide-react";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import type { PublicIntegrationStatus } from "@/lib/integrations-client";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { cn } from "@/lib/utils";
import { SettingsPaintText } from "./settings-paint-text";
import { ConnectedAccounts, DisconnectedCopy } from "./social-card-connection";
import { PROVIDER_CONTENT } from "./social-provider-content";
import type { SocialIntegrationCardModel } from "./types";

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
  const paintReady = useWindowLoadReady();
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
  const connectionSummary = status?.connected
    ? `${status.accounts.length} connected`
    : "No account connected";
  const statusPill = providerStatusPill(unavailable, connected, notConfigured);

  return (
    <article data-social-provider={provider} className="pf-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SocialProviderIcon provider={provider} label={`${displayName} logo`} className="size-9 shrink-0" />
          <div className="min-w-0">
            <SettingsPaintText
              ready={paintReady}
              liveAs="h3"
              liveClassName="truncate text-[13px] font-semibold text-[var(--pf-ink)]"
              paint={
                <h3 data-lcp={displayName}>
                  <span className="sr-only">{displayName}</span>
                </h3>
              }
            >
              {displayName}
            </SettingsPaintText>
            <SettingsPaintText
              ready={paintReady}
              liveAs="p"
              liveClassName="truncate text-[11px] text-muted-foreground"
              paint={
                <p data-lcp={connectionSummary}>
                  <span className="sr-only">{connectionSummary}</span>
                </p>
              }
            >
              {connectionSummary}
            </SettingsPaintText>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && !status ? (
            <span className="h-5 w-20 animate-pulse rounded-full bg-[var(--pf-active)]" />
          ) : (
            <SettingsPaintText
              ready={paintReady}
              liveAs="span"
              liveClassName={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
                statusPill.className
              )}
              paint={
                <span data-lcp={statusPill.label} className={statusPill.className}>
                  <span className="sr-only">{statusPill.label}</span>
                </span>
              }
            >
              {statusPill.label}
            </SettingsPaintText>
          )}
          {status?.configuration === "ready" && !loading && status.connected && (
            <button
              type="button"
              onClick={() => onConnect(status, youtubePolicyConsent)}
              disabled={busy || !canStartOAuth}
              className="pf-button-secondary h-8 px-2.5 text-[12px]"
              title={`Connect another ${displayName} account`}
            >
              <Plug className="size-3" /> Connect another
            </button>
          )}
        </div>
      </div>
      <SettingsPaintText
        ready={paintReady}
        liveAs="p"
        liveClassName="mt-2 text-[11px] leading-4 text-muted-foreground"
        paint={
          <p data-settings-copy="true" data-settings-text={content.description}>
            <span className="sr-only">{content.description}</span>
          </p>
        }
      >
        {content.description}
      </SettingsPaintText>

      {status?.connected && status.accounts.length > 0 ? (
        <ConnectedAccounts
          accounts={{
            status,
            displayName,
            busy,
            canStartOAuth,
            youtubePolicyConsent,
            onSync,
            onDisconnect,
            onConnect,
          }}
        />
      ) : (
        <DisconnectedCopy
          paintReady={paintReady}
          content={content}
          notConfigured={notConfigured}
          unavailable={unavailable}
        />
      )}

      {content.policyLinks && !notConfigured && (
        <div className="mt-3 flex min-w-0 flex-wrap gap-x-3 gap-y-1">
          {content.policyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-1 break-words text-[11px] font-semibold text-[var(--pf-link)] [overflow-wrap:anywhere]"
            >
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
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-0 items-center gap-1 break-words text-[11px] font-semibold text-[var(--pf-link)] [overflow-wrap:anywhere]"
              >
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
          <button
            type="button"
            onClick={() => status && onConnect(status, youtubePolicyConsent)}
            disabled={
              !status ||
              status.configuration !== "ready" ||
              !status.connectUrl ||
              loading ||
              busy ||
              !canStartOAuth
            }
            className={connectButtonClass(
              Boolean(
                status?.configuration === "ready" && status.connectUrl && canStartOAuth
              )
            )}
          >
            {connectButtonLabel({
              loading,
              status,
              notConfigured,
              unavailable,
              displayName,
            })}
          </button>
        </div>
      )}
    </article>
  );
}

function providerStatusPill(
  unavailable: boolean,
  connected: boolean,
  notConfigured: boolean
): { label: string; className: string } {
  if (unavailable) {
    return {
      label: "Status unavailable",
      className:
        "border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]",
    };
  }
  if (connected) {
    return {
      label: "Connected",
      className:
        "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]",
    };
  }
  if (notConfigured) {
    return {
      label: "Not configured",
      className: "border-border bg-[var(--pf-active)] text-muted-foreground",
    };
  }
  return {
    label: "Ready to connect",
    className: "border-border bg-[var(--pf-active)] text-muted-foreground",
  };
}

function connectButtonClass(canConnect: boolean): string {
  if (canConnect) return "pf-button-primary h-9 w-full";
  return "h-9 w-full cursor-not-allowed rounded-lg bg-[var(--pf-active)] text-[13px] font-semibold text-muted-foreground";
}

function connectButtonLabel({
  loading,
  status,
  notConfigured,
  unavailable,
  displayName,
}: {
  loading: boolean;
  status: PublicIntegrationStatus | null;
  notConfigured: boolean;
  unavailable: boolean;
  displayName: string;
}): string {
  if (loading && !status) return "Checking configuration…";
  if (notConfigured) return "Setup required";
  if (unavailable) return "Status unavailable";
  if (status?.connectUrl) return `Connect ${displayName}`;
  return "Connect endpoint unavailable";
}
