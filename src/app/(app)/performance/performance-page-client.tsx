"use client";

import { Toast } from "@/components/workbench/toast";
import { PerformanceChart } from "./performance-chart";
import { PerformanceEmptyState } from "./performance-empty-state";
import { PerformanceFailureNotice } from "./performance-failure-notice";
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
  const errors = [providerError, localError].filter((error): error is string => Boolean(error));
  const syncWarnings = buildSyncWarnings(connectedAccounts);
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

      <PerformanceFailureNotice
        errors={errors}
        syncFailures={syncWarnings.filter((warning) => warning.tone === "bad")}
        onDismiss={() => {
          setProviderError(null);
          setLocalError(null);
        }}
      />

      {syncWarnings
        .filter((warning) => warning.tone === "warn")
        .map((warning) => (
          <p key={warning.key} className="wb-notice shrink-0" data-tone="warn">
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
      {workspace.confirmDialog}
    </>
  );
}
