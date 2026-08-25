"use client";

import Link from "next/link";
import {
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import type { SocialProvider } from "@/lib/integrations-client";
import type { PerformanceDataset } from "@/lib/performance/csv";
import { formatSyncDate } from "@/lib/performance/format";
import {
  accountHandle,
  canAggregateConnectedProviders,
  connectedAccountName,
  type ConnectedAccountView,
} from "@/lib/performance/metrics";
import { cn } from "@/lib/utils";

export type PerformanceSourceWorkspace = {
  providers: ConnectedAccountView[];
  csvDataset: PerformanceDataset | null;
  selectedSource: string;
  busyProvider: SocialProvider | null;
  lastUpdatedAt: string | null;
  onSelect: (source: string) => void;
  onSync: (entry: ConnectedAccountView) => void;
  onImport: () => void;
  onClearCsv: () => void;
};

export function PerformanceSourcePanel({
  workspace,
}: {
  workspace: PerformanceSourceWorkspace;
}) {
  const {
    providers,
    csvDataset,
    selectedSource,
    busyProvider,
    lastUpdatedAt,
    onSelect,
    onSync,
    onImport,
    onClearCsv,
  } = workspace;
  const allowAllConnected = canAggregateConnectedProviders(providers);
  return (
    <section className="pf-card p-4" aria-labelledby="performance-sources-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h2 id="performance-sources-title" className="pf-section-title mt-1">Connected accounts and local reports</h2><p className="mt-1 text-[12px] text-muted-foreground">Provider data last refreshed {formatSyncDate(lastUpdatedAt)}</p></div>
        <label className="block w-full sm:w-72"><span className="mb-1 block text-[12px] font-semibold text-muted-foreground">Active performance source</span><select aria-label="Active performance source" value={selectedSource} onChange={(event) => onSelect(event.target.value)} className="h-9 w-full rounded-[8px] border border-border bg-white px-3 text-[11px] outline-none focus:border-[var(--pf-orange)]">
          {providers.length > 0 && <optgroup label="Connected accounts">{allowAllConnected && <option value="all-connected">All connected non-YouTube accounts</option>}{providers.map((entry) => <option key={entry.sourceKey} value={entry.sourceKey}>{entry.status.displayName} · {accountHandle(entry.account.account.username)}</option>)}</optgroup>}
          {csvDataset && <optgroup label="Local reports"><option value="csv">CSV · {csvDataset.accountLabel}</option></optgroup>}
        </select></label>
      </div>

      <div className="mt-4 grid gap-2 min-[1180px]:grid-cols-2 min-[1500px]:grid-cols-3">
        {providers.map((entry) => {
          const key = entry.sourceKey;
          const selected =
            selectedSource === key ||
            (allowAllConnected &&
              entry.provider !== "youtube" &&
              selectedSource === "all-connected");
          return (
            <article key={key} data-performance-account={key} className={cn("grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border p-2.5", selected ? "border-[var(--pf-link)]/40 bg-[var(--pf-link)]/10" : "border-border bg-card") }>
              <SocialProviderIcon provider={entry.provider} label={`${entry.status.displayName} logo`} className="size-8" />
              <div className="min-w-0"><b className="block truncate text-[11px]">{connectedAccountName(entry.account)}</b><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{accountHandle(entry.account.account.username)} · {entry.account.authorization.status !== "healthy" ? "Reconnect required" : entry.account.sync.status === "error" ? "Sync error" : entry.account.sync.status === "partial" ? "Partial metrics" : formatSyncDate(entry.account.sync.lastSuccessfulAt)}</p></div>
              {entry.account.authorization.status !== "healthy" ? (
                <Link href="/settings?tab=integrations" aria-label={`Reconnect ${entry.status.displayName} account ${accountHandle(entry.account.account.username)}`} className="grid size-8 place-items-center rounded-lg border border-[var(--pf-danger)]/40 bg-white text-[var(--pf-danger)]"><ExternalLink className="size-3.5" /></Link>
              ) : (
                <button type="button" onClick={() => onSync(entry)} disabled={busyProvider !== null} aria-label={`Sync ${entry.status.displayName} account ${accountHandle(entry.account.account.username)}`} className="grid size-8 place-items-center rounded-lg border border-border bg-white text-foreground disabled:opacity-50">{busyProvider === entry.provider ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}</button>
              )}
            </article>
          );
        })}
        {csvDataset && (
          <article data-performance-account="csv" className={cn("grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border p-2.5", selectedSource === "csv" ? "border-[var(--pf-link)]/40 bg-[var(--pf-link)]/10" : "border-border bg-card") }>
            <span className="grid size-8 place-items-center rounded-[8px] bg-foreground text-background"><FileSpreadsheet className="size-3.5" /></span>
            <div className="min-w-0"><b className="block truncate text-[11px]">{csvDataset.accountLabel}</b><p className="mt-0.5 truncate text-[11px] text-muted-foreground">Local CSV · {csvDataset.posts.length} posts</p></div>
            <div className="flex gap-1"><button type="button" onClick={onImport} aria-label="Replace local CSV" className="grid size-8 place-items-center rounded-lg border border-border bg-white"><Upload className="size-3.5" /></button><button type="button" onClick={onClearCsv} aria-label="Clear local CSV" className="grid size-8 place-items-center rounded-lg border border-[var(--pf-danger)]/40 bg-white text-[var(--pf-danger)]"><Trash2 className="size-3.5" /></button></div>
          </article>
        )}
      </div>
    </section>
  );
}
