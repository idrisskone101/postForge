"use client";

import { AlertCircle, BarChart3, Check, Download, Loader2, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { connectedAccountName } from "@/lib/performance/metrics";
import { cn } from "@/lib/utils";
import { PerformanceEmptyState } from "./performance-empty-state";
import {
  buildChartSeries,
  buildStatStripCells,
  CHART_COPY,
  performanceVariant,
  sourceHeading,
} from "./performance-helpers";
import { PerformancePosts } from "./performance-posts";
import {
  PerformanceAccountCards,
  PerformanceSourcePanel,
} from "./performance-source-panel";
import type {
  PerformanceChartSeries,
  PerformancePostsModel,
  PerformanceSourceWorkspace,
  PerformanceStatCell,
} from "./types";
import { usePerformanceWorkspace } from "./use-performance-workspace";

export function PerformancePageClient() {
  const workspace = usePerformanceWorkspace();
  const {
    inputRef,
    csvDataset,
    providerData,
    loading,
    importing,
    providerError,
    localError,
    busyProvider,
    range,
    view,
    search,
    toast,
    connectedAccounts,
    sourceOptions,
    activeSource,
    activeAccount,
    activeIsYouTube,
    sourcePosts,
    posts,
    excludedUnknownDates,
    aggregates,
    accountAggregates,
    syncTargets,
    setSelectedSource,
    setProviderError,
    setLocalError,
    setRange,
    setView,
    setSearch,
    importFile,
    downloadTemplate,
    clearCsvData,
    syncAccounts,
  } = workspace;

  if (loading) {
    return (
      <div className="grid min-h-[520px] place-items-center">
        <Loader2 className="size-6 animate-spin text-[var(--pf-muted)]" />
      </div>
    );
  }

  const variant = performanceVariant(activeIsYouTube);
  const chart = buildChartSeries(posts);
  const chartCopy = CHART_COPY[variant];
  const statCells = buildStatStripCells({
    variant,
    aggregates,
    postsInRange: posts.length,
  });
  const heading = sourceHeading({
    activeSource,
    csvAccountLabel: csvDataset?.accountLabel,
    csvImportedAt: csvDataset?.importedAt,
    accountName: activeAccount
      ? connectedAccountName(activeAccount.account)
      : undefined,
    youtube: activeIsYouTube,
    postCount: sourcePosts.length,
  });
  const sourceWorkspace: PerformanceSourceWorkspace = {
    providers: connectedAccounts,
    csvDataset,
    selectedSource: activeSource,
    busyProvider,
    lastUpdatedAt: providerData.lastUpdatedAt,
    onSelect: setSelectedSource,
    onSync: (entry) => syncAccounts([entry]),
    onImport: () => inputRef.current?.click(),
    onClearCsv: clearCsvData,
  };
  const postsModel: PerformancePostsModel = {
    posts,
    view,
    search,
    youtubeRawOnly: activeIsYouTube,
    tableFrameClassName: "mt-3 hidden overflow-x-auto sm:block",
    onSearch: setSearch,
    onView: setView,
  };

  return (
    <div
      data-page-inset="true"
      className="mx-auto min-w-0 max-w-[1280px] px-5 py-5 sm:px-7 lg:px-8"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) =>
          event.target.files?.[0] && importFile(event.target.files[0])
        }
      />

      {providerError || localError ? (
        <div
          role="alert"
          className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-[8px] border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)]"
        >
          <span className="flex min-w-0 items-start gap-2 break-words [overflow-wrap:anywhere]">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            {[providerError, localError].filter(Boolean).join(" ")}
          </span>
          <button
            type="button"
            className="shrink-0"
            onClick={() => {
              setProviderError(null);
              setLocalError(null);
            }}
            aria-label="Dismiss performance error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {sourceOptions.length === 0 ? (
        <PerformanceEmptyState
          importing={importing}
          onImport={() => inputRef.current?.click()}
          onDownloadTemplate={downloadTemplate}
          providerUnavailable={Boolean(providerError)}
        />
      ) : (
        <>
          <PerformanceSourcePanel workspace={sourceWorkspace} />
          <PerformanceAccountCards entries={accountAggregates} />
          {activeIsYouTube ? (
            <p className="mt-3 min-w-0 break-words rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3 py-2 text-[12px] leading-4 text-[var(--pf-muted)] [overflow-wrap:anywhere]">
              7/30/90 days selects videos published in that period. Views, likes, and comments are each video&apos;s current lifetime counters, not activity during the selected period. YouTube data is never mixed with another source or converted into a derived engagement rate.
            </p>
          ) : null}
          <section className="mt-4 flex flex-col justify-between gap-3 border-b border-[var(--pf-border)] pb-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h2 className="min-w-0 break-words text-[15px] font-semibold text-[var(--pf-ink)] [overflow-wrap:anywhere]">
                {heading.title}
              </h2>
              <p className="mt-1 min-w-0 break-words text-[12px] text-[var(--pf-muted)] [overflow-wrap:anywhere]">
                {heading.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-[8px] bg-[var(--pf-active)] p-1" aria-label="Performance date range">
                {([7, 30, 90] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={range === days}
                    onClick={() => setRange(days)}
                    className={cn(
                      "h-7 rounded-[6px] px-2 text-[12px] text-[var(--pf-muted)] transition-colors duration-[180ms]",
                      range === days &&
                        "bg-[var(--pf-surface)] font-semibold text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]"
                    )}
                  >
                    {days} days
                  </button>
                ))}
              </div>
              {activeSource === "csv" ? (
                <button type="button" onClick={() => inputRef.current?.click()} disabled={importing} className="pf-button-secondary">
                  <Upload className="size-3.5" /> Replace CSV
                </button>
              ) : (
                <button type="button" onClick={() => syncAccounts(syncTargets)} disabled={syncTargets.length === 0 || busyProvider !== null} className="pf-button-secondary">
                  {busyProvider ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}{" "}
                  Sync {activeSource === "all-connected" ? "all" : "account"}
                </button>
              )}
            </div>
          </section>
          {excludedUnknownDates > 0 ? (
            <p className="mt-3 rounded-[8px] border border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10 px-3 py-2 text-[12px] text-[var(--pf-lamp-amber)]">
              {excludedUnknownDates} provider-owned post{excludedUnknownDates === 1 ? " is" : "s are"} excluded from date ranges because the provider did not supply a publish date.
            </p>
          ) : null}
          <PerformanceStatStrip cells={statCells} />
          <PerformanceChart title={chartCopy.title} legendLabel={chartCopy.legendLabel} series={chart} />
          <PerformancePosts model={postsModel} />
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pf-border)] pt-4">
        <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--pf-link)]">
          <Download className="size-3" /> Download CSV template
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={importing} className="pf-button-secondary">
            {importing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Import local CSV
          </button>
          {csvDataset ? (
            <button type="button" onClick={clearCsvData} className="pf-button-secondary text-[var(--pf-danger)]">
              <Trash2 className="size-3.5" /> Clear CSV
            </button>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-[12px] font-medium text-background shadow-xl sm:left-auto sm:max-w-[420px]">
          <Check className="size-3.5 shrink-0 text-[var(--pf-success)]" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span>
        </div>
      ) : null}
    </div>
  );
}

function PerformanceStatStrip({ cells }: { cells: PerformanceStatCell[] }) {
  return (
    <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cells.map((cell) => (
        <article key={cell.label} className="pf-card flex min-w-0 flex-col gap-1.5 px-4 py-4 transition-colors duration-[180ms] hover:border-[var(--pf-border-strong)]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)]">{cell.label}</span>
          <b className={cn("text-[28px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-[var(--pf-ink)]", cell.unavailable && "text-[var(--pf-muted)]")}>{cell.value}</b>
          <small className="text-[12px] text-[var(--pf-muted)]">{cell.detail}</small>
        </article>
      ))}
    </section>
  );
}

function PerformanceChart({
  title,
  legendLabel,
  series,
}: {
  title: string;
  legendLabel: string;
  series: PerformanceChartSeries;
}) {
  return (
    <section className="pf-card mt-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="pf-section-title">{title}</h2>
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--pf-muted)]">
          <i className="size-2 rounded-full bg-[var(--pf-ink)]" />
          {legendLabel}
        </span>
      </div>
      {series.empty ? (
        <div className="grid h-52 place-items-center text-center">
          <BarChart3 className="mx-auto size-7 text-[var(--pf-muted)]" />
          <p className="mt-2 text-[12px] text-[var(--pf-muted)]">No posts in this range report view counts.</p>
        </div>
      ) : (
        <div className="relative mt-3 h-56 overflow-hidden bg-[linear-gradient(var(--pf-border)_1px,transparent_1px)] bg-[size:100%_25%]">
          <svg viewBox="0 0 920 190" preserveAspectRatio="none" className="h-[190px] w-full overflow-visible" aria-label="Reported views trend">
            <polyline points={series.polylinePoints} fill="none" stroke="var(--pf-ink)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            {series.markers.map((marker) => (
              <circle key={marker.postId} cx={marker.x} cy={marker.y} r="4" fill="var(--pf-surface)" stroke="var(--pf-ink)" strokeWidth="3" />
            ))}
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-[var(--pf-muted)]">
            <span>{series.domainStartLabel}</span>
            <span>{series.domainEndLabel}</span>
          </div>
        </div>
      )}
    </section>
  );
}
