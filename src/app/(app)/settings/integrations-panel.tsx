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
  type PublicIntegrationStatus,
  type SocialProvider,
} from "@/lib/integrations-client";
import { cn } from "@/lib/utils";
import { SocialIntegrationCard } from "./social-integration-card";

export type IntegrationsWorkspace = {
  providers: PublicIntegrationStatus[];
  loading: boolean;
  error: string | null;
  busyProvider: SocialProvider | null;
  onRefresh: () => void;
  onConnect: (
    status: PublicIntegrationStatus,
    acceptPolicies?: boolean
  ) => void;
  onSync: (status: PublicIntegrationStatus, accountId: string) => void;
  onDisconnect: (status: PublicIntegrationStatus, accountId: string) => void;
  onOpenWebhooks: () => void;
};

export function IntegrationsPanel({
  workspace,
}: {
  workspace: IntegrationsWorkspace;
}) {
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
  return (
    <>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h2 data-settings-heading="true" className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">Integrations</h2>
          <p data-settings-intro="true" className="mt-1 text-[12px] text-muted-foreground">Connect every account you publish or measure. Each account keeps its own scope and sync state.</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="pf-button-secondary shrink-0">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh status
        </button>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[var(--pf-link)]/30 bg-[var(--pf-link)]/10 p-3">
        <span className="grid size-7 place-items-center rounded-full bg-[var(--pf-link)] text-[12px] text-white">i</span>
        <div className="min-w-0">
          <b className="block text-[11px]">Connections are server-owned</b>
          <p className="mt-1 text-[12px] leading-4 text-muted-foreground">PostForge only reports an account as connected after OAuth and server-side token storage succeed. Multiple accounts per platform are supported.</p>
        </div>
        <ShieldCheck className="size-4 text-[var(--pf-link)]" />
      </div>

      {error && (
        <div role="alert" className="mt-4 flex flex-col items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-3 text-[12px] text-[var(--pf-danger)] sm:flex-row sm:items-center">
          <span className="flex min-w-0 items-start gap-2 break-words [overflow-wrap:anywhere]"><AlertCircle className="size-4 shrink-0" />{error}</span>
          <button type="button" onClick={onRefresh} className="rounded-lg border border-[var(--pf-danger)]/40 bg-white px-2.5 py-1.5 text-[12px] font-semibold">Try again</button>
        </div>
      )}

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold">Social accounts</h3>
          <p className="mt-1 text-[12px] text-muted-foreground">Multiple accounts per platform share the same server-owned connection state in Performance and Automations.</p>
        </div>
        <span className="shrink-0 text-[12px] text-muted-foreground">{connectedCount} connected</span>
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

      <SectionHeading title="Automation handoffs" description="Register server-owned delivery before sending review events outside PostForge." />
      <div className="grid gap-2 xl:grid-cols-2"><ServiceRow icon={<Webhook className="size-4" />} name="Custom webhook" description="No endpoint is registered. Open the delivery requirements and current status." action="View status" onAction={onOpenWebhooks} /></div>
    </>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) { return <div className="mb-2 mt-6"><h3 className="text-[13px] font-semibold">{title}</h3><p className="mt-1 text-[12px] text-muted-foreground">{description}</p></div>; }
function ServiceRow({ icon, name, description, action, onAction }: { icon: ReactNode; name: string; description: string; action: string; onAction?: () => void }) { return <article className="pf-card grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-3 p-3 sm:grid-cols-[36px_minmax(0,1fr)_auto]"><span className="grid size-9 place-items-center rounded-lg bg-[var(--pf-active)] text-foreground">{icon}</span><div className="min-w-0"><h3 className="truncate text-[12px] font-semibold">{name}</h3><p className="mt-1 break-words text-[12px] leading-4 text-muted-foreground">{description}</p></div>{onAction ? <button type="button" onClick={onAction} className="col-span-2 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-[12px] font-semibold text-foreground hover:bg-[var(--pf-active)] sm:col-span-1 sm:w-auto">{action}</button> : <span className="col-span-2 text-[12px] text-muted-foreground sm:col-span-1">{action}</span>}</article>; }
