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
import { formatMetric, formatSyncDate } from "@/lib/performance/format";
import {
  accountHandle,
  canAggregateConnectedProviders,
  connectedAccountName,
  type ConnectedAccountView,
} from "@/lib/performance/metrics";
import { cn } from "@/lib/utils";
import type { PerformanceSourceWorkspace } from "./types";

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
        <div>
          <h2 id="performance-sources-title" className="pf-section-title">
            Connected accounts and local reports
          </h2>
          <p className="mt-1 text-[12px] text-[var(--pf-muted)]">
            Provider data last refreshed {formatSyncDate(lastUpdatedAt)}
          </p>
        </div>
        <label className="block w-full sm:w-72">
          <span className="mb-1 block text-[12px] font-semibold text-[var(--pf-muted)]">
            Active performance source
          </span>
          <select
            aria-label="Active performance source"
            value={selectedSource}
            onChange={(event) => onSelect(event.target.value)}
            className="h-9 w-full rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3 text-[11px] text-[var(--pf-ink)] outline-none focus:border-primary"
          >
            {providers.length > 0 ? (
              <optgroup label="Connected accounts">
                {allowAllConnected ? (
                  <option value="all-connected">
                    All connected non-YouTube accounts
                  </option>
                ) : null}
                {providers.map((entry) => (
                  <option key={entry.sourceKey} value={entry.sourceKey}>
                    {entry.status.displayName} ·{" "}
                    {accountHandle(entry.account.account.username)}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {csvDataset ? (
              <optgroup label="Local reports">
                <option value="csv">CSV · {csvDataset.accountLabel}</option>
              </optgroup>
            ) : null}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-2 min-[1180px]:grid-cols-2 min-[1500px]:grid-cols-3">
        {providers.map((entry) => (
          <SourceAccountCard
            key={entry.sourceKey}
            entry={entry}
            selected={isSourceSelected(selectedSource, entry, allowAllConnected)}
            busy={busyProvider !== null}
            spinning={busyProvider === entry.provider}
            onSync={() => onSync(entry)}
          />
        ))}
        {csvDataset && (
          <article
            data-performance-account="csv"
            className={cn(
              "grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 rounded-[8px] border p-2.5",
              selectedSource === "csv"
                ? "border-primary bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] ring-1 ring-primary/25"
                : "border-[var(--pf-border)] bg-[var(--pf-surface)]"
            )}
          >
            <span className="grid size-8 place-items-center rounded-[8px] bg-[var(--pf-active)] text-[var(--pf-muted)]">
              <FileSpreadsheet className="size-3.5" />
            </span>
            <div className="min-w-0">
              <b className="block truncate text-[13px] font-semibold text-[var(--pf-ink)]">
                {csvDataset.accountLabel}
              </b>
              <p className="mt-0.5 truncate text-[11px] text-[var(--pf-muted)]">
                Local CSV · {csvDataset.posts.length} posts
              </p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={onImport}
                aria-label="Replace local CSV"
                className="grid size-8 place-items-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-ink)]"
              >
                <Upload className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onClearCsv}
                aria-label="Clear local CSV"
                className="grid size-8 place-items-center rounded-[8px] border border-[var(--pf-danger)]/40 bg-[var(--pf-surface)] text-[var(--pf-danger)]"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function SourceAccountCard({
  entry,
  selected,
  busy,
  spinning,
  onSync,
}: {
  entry: ConnectedAccountView;
  selected: boolean;
  busy: boolean;
  spinning: boolean;
  onSync: () => void;
}) {
  const key = entry.sourceKey;
  const unhealthy = entry.account.authorization.status !== "healthy";
  return (
    <article
      data-performance-account={key}
      className={cn(
        "grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 rounded-[8px] border p-2.5",
        selected
          ? "border-primary bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] ring-1 ring-primary/25"
          : "border-[var(--pf-border)] bg-[var(--pf-surface)]"
      )}
    >
      <SocialProviderIcon
        provider={entry.provider}
        label={`${entry.status.displayName} logo`}
        className="size-8"
      />
      <div className="min-w-0">
        <b className="block truncate text-[13px] font-semibold text-[var(--pf-ink)]">
          {connectedAccountName(entry.account)}
        </b>
        <p className="mt-0.5 truncate text-[11px] text-[var(--pf-muted)]">
          {accountHandle(entry.account.account.username)} · {syncCaption(entry)}
        </p>
      </div>
      {unhealthy ? (
        <Link
          href="/settings?tab=integrations"
          aria-label={`Reconnect ${entry.status.displayName} account ${accountHandle(entry.account.account.username)}`}
          className="grid size-8 place-items-center rounded-[8px] border border-[var(--pf-danger)]/40 bg-[var(--pf-surface)] text-[var(--pf-danger)]"
        >
          <ExternalLink className="size-3.5" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onSync}
          disabled={busy}
          aria-label={`Sync ${entry.status.displayName} account ${accountHandle(entry.account.account.username)}`}
          className="grid size-8 place-items-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-ink)] disabled:opacity-50"
        >
          {spinning ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
        </button>
      )}
    </article>
  );
}

function isSourceSelected(
  selectedSource: string,
  entry: ConnectedAccountView,
  allowAllConnected: boolean
) {
  if (selectedSource === entry.sourceKey) return true;
  return (
    allowAllConnected &&
    entry.provider !== "youtube" &&
    selectedSource === "all-connected"
  );
}

function syncCaption(entry: ConnectedAccountView) {
  if (entry.account.authorization.status !== "healthy") {
    return "Reconnect required";
  }
  if (entry.account.sync.status === "error") return "Sync error";
  if (entry.account.sync.status === "partial") return "Partial metrics";
  return formatSyncDate(entry.account.sync.lastSuccessfulAt);
}

type AccountAggregateEntry = ConnectedAccountView & {
  aggregate: {
    views: { value: number | null; total: number };
    likes: { value: number | null };
    comments: { value: number | null };
    shares: { value: number | null };
    saves: { value: number | null };
  };
};

export function PerformanceAccountCards({
  entries,
}: {
  entries: AccountAggregateEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <section className="mt-4" aria-label="Per account performance">
      <h2 className="text-[13px] font-semibold text-[var(--pf-ink)]">
        Performance by account
      </h2>
      <div className="mt-3 grid gap-3 min-[1100px]:grid-cols-2 min-[1400px]:grid-cols-3">
        {entries.map((entry) => (
          <article key={entry.sourceKey} className="pf-card flex flex-col gap-3 px-4 py-4">
            <div className="flex items-center gap-2">
              <SocialProviderIcon provider={entry.provider} className="size-6 shrink-0" />
              <div className="min-w-0">
                <b className="block truncate text-[12px] text-[var(--pf-ink)]">
                  {connectedAccountName(entry.account)}
                </b>
                <span className="block truncate text-[11px] text-[var(--pf-muted)]">
                  {entry.account.account.username
                    ? accountHandle(entry.account.account.username)
                    : entry.status.displayName}
                </span>
              </div>
              {entry.account.authorization.status !== "healthy" ? (
                <Link href="/settings?tab=integrations" className="pf-status-danger ml-auto shrink-0 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]">
                  Reconnect
                </Link>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-3 border-t border-[var(--pf-border)] pt-3">
              {(
                [
                  ["Views", entry.aggregate.views.value],
                  ["Likes", entry.aggregate.likes.value],
                  ["Comments", entry.aggregate.comments.value],
                  ["Shares", entry.aggregate.shares.value],
                  ["Saves", entry.aggregate.saves.value],
                  ["Posts", entry.aggregate.views.total],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)]">
                    {label}
                  </span>
                  <b className="mt-1 block text-[13px] font-semibold tabular-nums text-[var(--pf-ink)]">
                    {formatMetric(value)}
                  </b>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
