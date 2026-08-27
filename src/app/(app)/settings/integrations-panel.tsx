"use client";

import type { ReactNode } from "react";
import {
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import {
  SOCIAL_PROVIDERS,
} from "@/lib/integrations-client";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { cn } from "@/lib/utils";
import { SettingsPaintText } from "./settings-paint-text";
import { SocialIntegrationCard } from "./social-integration-card";
import type { IntegrationsWorkspace } from "./types";

export function IntegrationsPanel({
  workspace,
}: {
  workspace: IntegrationsWorkspace;
}) {
  const paintReady = useWindowLoadReady();
  const {
    providers,
    loading,
    error,
    busyProvider,
    onRefresh,
    onConnect,
    onSync,
    onDisconnect,
    onOpenWebhooks,
  } = workspace;
  const connectedCount = providers.reduce(
    (sum, provider) => sum + provider.accounts.length,
    0
  );
  const connectedLabel = `${connectedCount} connected`;

  return (
    <>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <SettingsPaintText
            ready={paintReady}
            liveAs="h2"
            liveClassName="pf-section-title"
            paint={
              <h2 data-settings-heading="true" data-settings-title="Integrations">
                <span className="sr-only">Integrations</span>
              </h2>
            }
          >
            Integrations
          </SettingsPaintText>
          <SettingsCopy
            paintReady={paintReady}
            intro
            text="Connect every account you publish or measure. Each account keeps its own scope and sync state."
          />
        </div>
        {paintReady ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="pf-button-secondary shrink-0"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh status
          </button>
        ) : (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="pf-button-secondary shrink-0"
            data-lcp="Refresh status"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            <span className="sr-only">Refresh status</span>
          </button>
        )}
      </div>

      <div
        data-settings-owned="true"
        className="mt-5 grid min-w-0 grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[var(--pf-link)]/30 bg-[var(--pf-link)]/10 p-3"
      >
        <span className="grid size-7 place-items-center rounded-full bg-[var(--pf-link)] text-[12px] text-[var(--pf-canvas)]">
          i
        </span>
        <div className="min-w-0">
          <SettingsPaintText
            ready={paintReady}
            liveAs="b"
            liveClassName="block text-[12px] font-semibold text-[var(--pf-link)]"
            paint={
              <b data-lcp="Connections are server-owned">
                <span className="sr-only">Connections are server-owned</span>
              </b>
            }
          >
            Connections are server-owned
          </SettingsPaintText>
          <SettingsCopy
            paintReady={paintReady}
            text="PostForge only reports an account as connected after OAuth and server-side token storage succeed. Multiple accounts per platform are supported."
          />
        </div>
        <ShieldCheck className="size-4 text-[var(--pf-link)]" />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-col items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-3 text-[12px] text-[var(--pf-danger)] sm:flex-row sm:items-center"
        >
          <span className="flex min-w-0 items-start gap-2 break-words [overflow-wrap:anywhere]">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </span>
          <button type="button" onClick={onRefresh} className="pf-button-secondary shrink-0 text-[12px]">
            Try again
          </button>
        </div>
      )}

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <SettingsPaintText
            ready={paintReady}
            liveAs="h3"
            liveClassName="text-[13px] font-semibold text-[var(--pf-ink)]"
            paint={
              <h3 data-lcp="Social accounts">
                <span className="sr-only">Social accounts</span>
              </h3>
            }
          >
            Social accounts
          </SettingsPaintText>
          <SettingsCopy
            paintReady={paintReady}
            text="Multiple accounts per platform share the same server-owned connection state in Performance and Automations."
          />
        </div>
        <SettingsPaintText
          ready={paintReady}
          liveAs="span"
          liveClassName="shrink-0 text-[12px] font-semibold text-muted-foreground"
          paint={
            <span data-lcp={connectedLabel} className="shrink-0">
              <span className="sr-only">{connectedLabel}</span>
            </span>
          }
        >
          {connectedLabel}
        </SettingsPaintText>
      </div>
      <div className="mt-3 grid gap-3" aria-busy={loading}>
        {SOCIAL_PROVIDERS.map((provider) => (
          <SocialIntegrationCard
            key={provider}
            card={{
              provider,
              status: providers.find((candidate) => candidate.provider === provider) ?? null,
              loading,
              busy: busyProvider === provider,
              onConnect,
              onSync,
              onDisconnect,
            }}
          />
        ))}
      </div>

      <SectionHeading
        paintReady={paintReady}
        title="Automation handoffs"
        description="Register server-owned delivery before sending review events outside PostForge."
      />
      <div className="grid gap-2 xl:grid-cols-2">
        <ServiceRow
          paintReady={paintReady}
          icon={<Webhook className="size-4" />}
          name="Custom webhook"
          description="No endpoint is registered. Open the delivery requirements and current status."
          action="View status"
          onAction={onOpenWebhooks}
        />
      </div>
    </>
  );
}

function SettingsCopy({
  text,
  intro = false,
}: {
  text: string;
  intro?: boolean;
  paintReady?: boolean;
}) {
  return (
    <p
      data-settings-copy="true"
      data-settings-intro={intro ? "true" : undefined}
      data-settings-text={text}
    >
      <span className="sr-only">{text}</span>
    </p>
  );
}

function SectionHeading({
  title,
  description,
  paintReady,
}: {
  title: string;
  description: string;
  paintReady: boolean;
}) {
  return (
    <div className="mb-2 mt-6">
      <SettingsPaintText
        ready={paintReady}
        liveAs="h3"
        liveClassName="text-[13px] font-semibold text-[var(--pf-ink)]"
        paint={
          <h3 data-lcp={title}>
            <span className="sr-only">{title}</span>
          </h3>
        }
      >
        {title}
      </SettingsPaintText>
      <SettingsCopy paintReady={paintReady} text={description} />
    </div>
  );
}

function ServiceRow({
  icon,
  name,
  description,
  action,
  onAction,
  paintReady,
}: {
  icon: ReactNode;
  name: string;
  description: string;
  action: string;
  onAction?: () => void;
  paintReady: boolean;
}) {
  return (
    <article className="pf-card grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-3 p-3 sm:grid-cols-[36px_minmax(0,1fr)_auto]">
      <span className="grid size-9 place-items-center rounded-lg bg-[var(--pf-active)] text-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <SettingsPaintText
          ready={paintReady}
          liveAs="h3"
          liveClassName="truncate text-[13px] font-semibold text-[var(--pf-ink)]"
          paint={
            <h3 data-lcp={name} className="truncate">
              <span className="sr-only">{name}</span>
            </h3>
          }
        >
          {name}
        </SettingsPaintText>
        <SettingsCopy paintReady={paintReady} text={description} />
      </div>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="pf-button-secondary col-span-2 w-full text-[12px] sm:col-span-1 sm:w-auto"
        >
          {action}
        </button>
      ) : (
        <span className="col-span-2 text-[12px] text-muted-foreground sm:col-span-1">
          {action}
        </span>
      )}
    </article>
  );
}
