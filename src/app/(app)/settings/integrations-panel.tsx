"use client";

import { Button, Icon, Panel, StatusChip } from "@/components/workbench";
import { SOCIAL_PROVIDERS } from "@/lib/integrations-client";
import { needsReauthorization } from "./integration-row-model";
import { SocialIntegrationCard } from "./social-integration-card";
import type { IntegrationsWorkspace } from "./types";

export function IntegrationsPanel({
  workspace,
}: {
  workspace: IntegrationsWorkspace;
}) {
  const { providers, loading, error, busyProvider, onRefresh, onOpenWebhooks } = workspace;
  const primaryReconnectId =
    providers
      .flatMap((provider) => provider.accounts)
      .find((account) => needsReauthorization(account))?.account.id ?? null;

  return (
    <>
      <Panel
        pad="wide"
        title="Social accounts"
        aria-busy={loading}
        className="gap-2 max-md:px-4 max-md:pb-4 [&>.wb-panel-head]:min-h-5"
        action={
          <Button size={32} onClick={onRefresh} disabled={loading} className="-my-1.5">
            Refresh status
          </Button>
        }
      >
        {error && (
          <p role="alert" className="wb-notice my-1 break-words py-1.5 pr-1.5 [overflow-wrap:anywhere]" data-tone="bad">
            <span className="min-w-0 flex-1 py-1">
              <strong>{error.lead}</strong> {error.detail}
            </span>
            <Button size={32} onClick={onRefresh}>
              Try again
            </Button>
          </p>
        )}
        <div className="@container flex flex-col">
          <div
            aria-hidden="true"
            className="hidden h-8 shrink-0 items-center gap-3.5 text-xs font-semibold leading-4 text-fg-muted @min-[841px]:flex"
          >
            <span className="w-11 shrink-0" />
            <span className="min-w-[153px] flex-1">Platform</span>
            <span className="w-[168px] min-w-[157px]">Connection</span>
            <span className="w-[150px] shrink-0">Metrics</span>
            <span className="w-[170px] shrink-0">Publishing</span>
            <span className="w-28 min-w-[97px] shrink-[1000]" />
          </div>
          {SOCIAL_PROVIDERS.map((provider) => (
            <SocialIntegrationCard
              key={provider}
              card={{
                provider,
                status: providers.find((candidate) => candidate.provider === provider) ?? null,
                loading,
                busy: busyProvider === provider,
                onConnect: workspace.onConnect,
                onSync: workspace.onSync,
                onDisconnect: workspace.onDisconnect,
                onRefresh,
                primaryReconnectId,
              }}
            />
          ))}
        </div>
      </Panel>

      <Panel pad="wide" title="Automation handoffs" className="gap-[18px] [&>.wb-panel-head]:min-h-5">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-dashed border-edge text-fg-muted">
            <Icon name="link" size={22} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold leading-[18px] text-fg">Custom webhook</span>
            <span className="text-balance text-[13px] leading-4 text-fg-muted">No endpoint is registered</span>
          </div>
          <StatusChip tone="neutral" className="shrink-0">
            Not configured
          </StatusChip>
          <div className="flex w-full justify-end sm:w-[132px] sm:shrink-0">
            <Button onClick={onOpenWebhooks} className="max-sm:h-11 max-sm:w-full">
              View status
            </Button>
          </div>
        </div>
      </Panel>
    </>
  );
}

