"use client";

import { useId, useState } from "react";
import { Button, Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";
import { AccountRow } from "./social-account-row";
import { PolicyLinks, SetupDetail, YouTubeConsent } from "./social-card-connection";
import { IntegrationRow, type IntegrationRowView } from "./integration-row";
import {
  providerChip,
  providerState,
  UNAVAILABLE_CELL,
  type ProviderState,
} from "./integration-row-model";
import { PROVIDER_CONTENT } from "./social-provider-content";
import type { SocialIntegrationCardModel } from "./types";

export function SocialIntegrationCard({ card }: { card: SocialIntegrationCardModel }) {
  const { provider, status, loading, busy, onConnect, onRefresh } = card;
  const [youtubePolicyConsent, setYouTubePolicyConsent] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const setupId = useId();
  const content = PROVIDER_CONTENT[provider];
  const displayName = status?.displayName ?? PROVIDER_NAMES[provider];
  const state = providerState(status, loading);
  const youtubeCompliance = status?.youtubeCompliance ?? null;
  const youtubeOAuthNeedsConsent =
    provider === "youtube" &&
    status?.configuration === "ready" &&
    (state.kind !== "connected" ||
      status.accounts.some((account) => account.authorization.status !== "healthy"));
  const canStartOAuth =
    provider !== "youtube" || (Boolean(youtubeCompliance) && youtubePolicyConsent);
  const connect = () => status && onConnect(status, youtubePolicyConsent);
  const policyLinks =
    content.policyLinks && state.kind !== "not_configured" && state.kind !== "loading"
      ? content.policyLinks
      : null;
  const consentBlock =
    provider === "youtube" && youtubeCompliance ? (
      <YouTubeConsent
        compliance={youtubeCompliance}
        needsConsent={youtubeOAuthNeedsConsent}
        consent={youtubePolicyConsent}
        onConsentChange={setYouTubePolicyConsent}
      />
    ) : null;

  if (state.kind === "connected" && status) {
    return (
      <div data-social-provider={provider} className="flex flex-col">
        {status.accounts.map((account) => (
          <AccountRow
            key={account.account.id}
            row={{
              providerStatus: status,
              account,
              busy,
              primaryReconnect: card.primaryReconnectId === account.account.id,
              canStartOAuth,
              onSync: card.onSync,
              onDisconnect: card.onDisconnect,
              onReconnect: () =>
                onConnect(
                  { ...status, connected: false, accounts: [], accountCount: 0 },
                  youtubePolicyConsent
                ),
            }}
          />
        ))}
        {status.configuration === "ready" && (
          <div className="-mt-2 flex justify-end pb-4">
            <Button
              size={32}
              disabled={busy || !canStartOAuth}
              aria-label={`Connect another ${displayName} account`}
              onClick={connect}
            >
              <Icon name="plus" size={14} strokeWidth={2} />
              Connect another
            </Button>
          </div>
        )}
        {consentBlock && <div className="pb-4">{consentBlock}</div>}
        {policyLinks && <PolicyLinks links={policyLinks} />}
      </div>
    );
  }

  const view: IntegrationRowView = {
    tile: { provider, label: `${displayName} logo`, dashed: state.kind !== "loading" },
    name: displayName,
    sub: providerSub(state, Boolean(status?.connectUrl)),
    chip: state.kind === "loading" ? null : providerChip(state),
    metrics: state.kind === "loading" ? null : UNAVAILABLE_CELL,
    publishing: state.kind === "loading" ? null : UNAVAILABLE_CELL,
    action: providerAction(state, {
      displayName,
      setupId,
      setupOpen,
      onToggleSetup: () => setSetupOpen((open) => !open),
      canConnect: Boolean(status?.connectUrl) && canStartOAuth && !busy,
      onConnect: connect,
      onRefresh,
    }),
  };

  return (
    <div data-social-provider={provider} className="flex flex-col">
      <IntegrationRow view={view}>
        {state.kind === "not_configured" && (
          <SetupDetail id={setupId} open={setupOpen} content={content} />
        )}
        {state.kind === "ready" && consentBlock}
      </IntegrationRow>
      {policyLinks && <PolicyLinks links={policyLinks} />}
    </div>
  );
}

const PROVIDER_NAMES = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" } as const;

function providerSub(state: ProviderState, hasConnectUrl: boolean): string | undefined {
  switch (state.kind) {
    case "loading":
      return undefined;
    case "unavailable":
      return "The integration service did not return this provider";
    case "not_configured":
      return "Setup required";
    case "ready":
      return hasConnectUrl ? "No account connected" : "Connect endpoint unavailable";
    case "connected":
      return undefined;
  }
}

function providerAction(
  state: ProviderState,
  options: {
    displayName: string;
    setupId: string;
    setupOpen: boolean;
    onToggleSetup: () => void;
    canConnect: boolean;
    onConnect: () => void;
    onRefresh?: () => void;
  }
) {
  switch (state.kind) {
    case "loading":
      return <span aria-hidden="true" className="wb-skeleton h-9 w-[88px] rounded-full" />;
    case "unavailable":
      return options.onRefresh ? (
        <Button onClick={options.onRefresh}>Refresh</Button>
      ) : null;
    case "not_configured":
      return (
        <Button
          variant="strong"
          aria-expanded={options.setupOpen}
          aria-controls={options.setupId}
          aria-label={`Set up ${options.displayName}`}
          onClick={options.onToggleSetup}
          className="pr-3"
        >
          Set up
          <Icon
            name="chevron-down"
            size={14}
            className={cn(
              "text-fg-secondary transition-transform duration-[var(--pf-dur-state)] ease-pf",
              options.setupOpen && "rotate-180"
            )}
          />
        </Button>
      );
    case "ready":
      return (
        <Button
          variant="strong"
          aria-label={`Connect ${options.displayName}`}
          disabled={!options.canConnect}
          onClick={options.onConnect}
        >
          Connect
        </Button>
      );
    case "connected":
      return null;
  }
}
