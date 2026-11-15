"use client";

import { IconButton } from "@/components/workbench/icon-button";
import { Toast } from "@/components/workbench/toast";
import { PerformanceChart } from "./performance-chart";
import { PerformanceEmptyState } from "./performance-empty-state";
import {
  buildChartSeries,
  buildStatStripCells,
  buildSyncWarnings,
  performanceVariant,
  sourceLegend,
} from "./performance-helpers";
import { PerformancePosts } from "./performance-posts";
import { PerformanceRangePill } from "./performance-range-pill";
import { PerformanceSkeleton } from "./performance-skeleton";
import { PerformanceSourcePanel } from "./performance-source-panel";
import { PerformanceStats } from "./performance-stats";
import type {
  PerformanceInitial,
  PerformancePostsModel,
  PerformanceSourceWorkspace,
} from "./types";
import { usePerformanceWorkspace } from "./use-performance-workspace";

export function PerformancePageClient({ initial }: { initial: PerformanceInitial | null }) {
  const workspace = usePerformanceWorkspace(initial);
  const {
    hydrationTime,
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
    dismissToast,
    connectedAccounts,
    sourceOptions,
    activeSource,
    activeAccount,
    activeIsYouTube,
    posts,
    excludedUnknownDates,
    aggregates,
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

  if (loading) return <PerformanceSkeleton />;

  const now = hydrationTime === null ? new Date() : new Date(hydrationTime);
  const variant = performanceVariant(activeIsYouTube);
  const openImport = () => inputRef.current?.click();
  const sourceWorkspace: PerformanceSourceWorkspace = {
    statuses: providerData.providers,
    providers: connectedAccounts,
    csvDataset,
    selectedSource: activeSource,
    selectable: sourceOptions.length > 1,
    busyProvider,
    importing,
    syncAll:
      activeSource === "all-connected" && syncTargets.length > 0
        ? () => syncAccounts(syncTargets)
        : null,
    onSelect: setSelectedSource,
    onSync: (entry) => syncAccounts([entry]),
    onImport: openImport,
    onClearCsv: clearCsvData,
  };
  const postsModel: PerformancePostsModel = {
    posts,
    view,
    search,
    range,
    youtubeRawOnly: activeIsYouTube,
    onSearch: setSearch,
    onView: setView,
    onRange: setRange,
  };
  const errors = [providerError, localError].filter(Boolean).join(" ");
  const hasData = sourceOptions.length > 0;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0])}
      />
      {hasData ? <PerformanceRangePill range={range} onRange={setRange} /> : null}

      {errors ? (
        <div role="alert" className="wb-notice wb-fade-in shrink-0 py-2 pr-2" data-tone="bad">
          <span className="min-w-0 flex-1 text-bad [overflow-wrap:anywhere]">{errors}</span>
          <IconButton
            icon="x"
            label="Dismiss performance error"
            variant="ghost"
            size={28}
            className="text-bad"
            onClick={() => {
              setProviderError(null);
              setLocalError(null);
            }}
          />
        </div>
      ) : null}

      {buildSyncWarnings(connectedAccounts).map((warning) => (
        <p key={warning.key} className="wb-notice shrink-0" data-tone={warning.tone}>
          <strong>{warning.lead}</strong>
          <span className="min-w-0 [overflow-wrap:anywhere]">{warning.text}</span>
        </p>
      ))}

      {hasData ? (
        <>
          {excludedUnknownDates > 0 ? (
            <p className="wb-notice shrink-0" data-tone="warn">
              <strong>
                {excludedUnknownDates} {excludedUnknownDates === 1 ? "post has" : "posts have"} no publish date
              </strong>
              and {excludedUnknownDates === 1 ? "is" : "are"} left out of date ranges.
            </p>
          ) : null}
          <PerformanceStats cells={buildStatStripCells(variant, aggregates, posts.length)} />
          <div className="flex gap-3 max-lg:flex-col">
            <PerformanceChart
              title={variant === "youtube" ? "Lifetime views" : "Views"}
              legend={sourceLegend(activeSource, activeAccount)}
              series={buildChartSeries(posts, range, now)}
            />
            <PerformanceSourcePanel workspace={sourceWorkspace} />
          </div>
          <PerformancePosts model={postsModel} />
        </>
      ) : (
        <div className="flex gap-3 max-lg:flex-col">
          <PerformanceEmptyState
            importing={importing}
            onImport={openImport}
            onDownloadTemplate={downloadTemplate}
          />
          <PerformanceSourcePanel workspace={sourceWorkspace} />
        </div>
      )}

      {toast ? (
        <div className="wb-toast-region">
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        </div>
      ) : null}
    </>
  );
}
