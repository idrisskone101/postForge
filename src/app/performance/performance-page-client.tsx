"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Check,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Grid2X2,
  List,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import type { ProviderPostMetrics } from "@/lib/integrations-client";
import {
  formatDate,
  formatMetric,
  formatSyncDate,
  metricAvailability,
} from "@/lib/performance/format";
import {
  accountHandle,
  connectedAccountName,
  postEngagementRate,
  type PerformancePostView,
} from "@/lib/performance/metrics";
import { cn } from "@/lib/utils";
import { PerformanceEmptyState } from "./performance-empty-state";
import { PerformanceSourcePanel } from "./performance-source-panel";
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
        <Loader2 className="size-6 animate-spin text-[var(--pf-orange)]" />
      </div>
    );
  }

  const chartPosts = [...posts]
    .filter(
      (post): post is PerformancePostView & {
        publishedAt: string;
        metrics: ProviderPostMetrics & { views: number };
      } => post.publishedAt !== null && post.metrics.views !== null
    )
    .sort(
      (a, b) =>
        new Date(a.publishedAt).valueOf() - new Date(b.publishedAt).valueOf()
    )
    .slice(-12);
  const maxViews = Math.max(...chartPosts.map((post) => post.metrics.views), 1);
  const points = chartPosts
    .map(
      (post, index) =>
        `${chartPosts.length === 1 ? 50 : (index / (chartPosts.length - 1)) * 920},${180 - (post.metrics.views / maxViews) * 150}`
    )
    .join(" ");

  return (
    <div className="px-5 py-5 sm:px-7 lg:px-8">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0])}
      />

      {(providerError || localError) && (
        <div role="alert" className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)]">
          <span className="flex min-w-0 items-start gap-2 break-words [overflow-wrap:anywhere]"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{[providerError, localError].filter(Boolean).join(" ")}</span>
          <button type="button" className="shrink-0" onClick={() => { setProviderError(null); setLocalError(null); }} aria-label="Dismiss performance error"><X className="size-3.5" /></button>
        </div>
      )}

      {sourceOptions.length === 0 ? (
        <PerformanceEmptyState
          importing={importing}
          onImport={() => inputRef.current?.click()}
          onDownloadTemplate={downloadTemplate}
          providerUnavailable={Boolean(providerError)}
        />
      ) : (
        <>
          <PerformanceSourcePanel
            providers={connectedAccounts}
            csvDataset={csvDataset}
            selectedSource={activeSource}
            busyProvider={busyProvider}
            lastUpdatedAt={providerData.lastUpdatedAt}
            onSelect={setSelectedSource}
            onSync={(entry) => syncAccounts([entry])}
            onImport={() => inputRef.current?.click()}
            onClearCsv={clearCsvData}
          />

          {connectedAccounts.length > 0 && (
            <section className="mt-4" aria-label="Per account performance">
              <h2 className="mt-1 text-[13px] font-semibold">Performance by account</h2>
              <div className="mt-2 grid gap-2 min-[1100px]:grid-cols-2 min-[1400px]:grid-cols-3">
                {accountAggregates.map((entry) => (
                  <article key={entry.sourceKey} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-center gap-2">
                      <SocialProviderIcon provider={entry.provider} className="size-6 shrink-0" />
                      <div className="min-w-0">
                        <b className="block truncate text-[12px]">{connectedAccountName(entry.account)}</b>
                        <span className="block truncate text-[11px] text-muted-foreground">{entry.account.account.username ? accountHandle(entry.account.account.username) : entry.status.displayName}</span>
                      </div>
                      {entry.account.authorization.status !== "healthy" && (
                        <Link href="/settings?tab=integrations" className="ml-auto rounded-full border border-[var(--pf-danger)]/40 bg-white px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-danger)]">Reconnect</Link>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5 border-t border-border pt-2">
                      {([
                        ["Views", entry.aggregate.views.value],
                        ["Likes", entry.aggregate.likes.value],
                        ["Comments", entry.aggregate.comments.value],
                        ["Shares", entry.aggregate.shares.value],
                        ["Saves", entry.aggregate.saves.value],
                        ["Posts", entry.aggregate.views.total],
                      ] as const).map(([label, value]) => (
                        <div key={label}>
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
                          <b className="mt-0.5 block font-mono text-[11px] tabular-nums">{formatMetric(value)}</b>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeIsYouTube && (
            <p className="mt-3 min-w-0 break-words rounded-[8px] border border-[var(--pf-link)]/30 bg-[var(--pf-link)]/10 px-3 py-2 text-[12px] leading-4 text-[var(--pf-link)] [overflow-wrap:anywhere]">
              7/30/90 days selects videos published in that period. Views, likes, and comments are each video&apos;s current lifetime counters, not activity during the selected period. YouTube data is never mixed with another source or converted into a derived engagement rate.
            </p>
          )}

          <section className="mt-4 flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h2 className="mt-1 min-w-0 break-words text-[15px] font-semibold [overflow-wrap:anywhere]">
                {activeSource === "csv"
                  ? csvDataset?.accountLabel
                  : activeSource === "all-connected"
                    ? "All connected non-YouTube accounts"
                    : activeAccount ? connectedAccountName(activeAccount.account) : "Connected account"}
              </h2>
              <p className="mt-1 min-w-0 break-words text-[12px] text-muted-foreground [overflow-wrap:anywhere]">
                {activeSource === "csv"
                  ? `Local CSV · imported ${csvDataset ? formatSyncDate(csvDataset.importedAt) : ""}`
                  : `${activeIsYouTube ? "YouTube API data" : "Provider-owned data"} · ${sourcePosts.length} post${sourcePosts.length === 1 ? "" : "s"} · no estimated metrics`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-[8px] bg-[var(--pf-active)] p-1" aria-label="Performance date range">
                {([7, 30, 90] as const).map((days) => (
                  <button key={days} type="button" aria-pressed={range === days} onClick={() => setRange(days)} className={cn("h-7 rounded-[6px] px-2 text-[12px] text-muted-foreground", range === days && "bg-white font-semibold text-foreground shadow-sm")}>{days} days</button>
                ))}
              </div>
              {activeSource === "csv" ? (
                <button type="button" onClick={() => inputRef.current?.click()} disabled={importing} className="pf-button-secondary"><Upload className="size-3.5" /> Replace CSV</button>
              ) : (
                <button type="button" onClick={() => syncAccounts(syncTargets)} disabled={syncTargets.length === 0 || busyProvider !== null} className="pf-button-secondary">
                  {busyProvider ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Sync {activeSource === "all-connected" ? "all" : "account"}
                </button>
              )}
            </div>
          </section>

          {excludedUnknownDates > 0 && (
            <p className="mt-3 rounded-[8px] border border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10 px-3 py-2 text-[12px] text-[var(--pf-lamp-amber)]">
              {excludedUnknownDates} provider-owned post{excludedUnknownDates === 1 ? " is" : "s are"} excluded from date ranges because the provider did not supply a publish date.
            </p>
          )}

          <section className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
            <Metric label="Total views" value={formatMetric(aggregates.views.value)} detail={activeIsYouTube ? `Lifetime counters · ${metricAvailability(aggregates.views, "videos")}` : metricAvailability(aggregates.views, "posts")} unavailable={aggregates.views.value === null} />
            {activeIsYouTube ? <Metric label="Total likes" value={formatMetric(aggregates.likes.value)} detail={`Lifetime counters · ${metricAvailability(aggregates.likes, "videos")}`} unavailable={aggregates.likes.value === null} /> : <Metric label="Engagement rate" value={aggregates.engagementRate?.value === null ? "—" : `${aggregates.engagementRate!.value!.toFixed(1)}%`} detail={metricAvailability(aggregates.engagementRate!, "posts")} unavailable={aggregates.engagementRate?.value === null} />}
            {activeIsYouTube ? <Metric label="Total comments" value={formatMetric(aggregates.comments.value)} detail={`Lifetime counters · ${metricAvailability(aggregates.comments, "videos")}`} unavailable={aggregates.comments.value === null} /> : <Metric label="Saves" value={formatMetric(aggregates.saves.value)} detail={metricAvailability(aggregates.saves, "posts")} unavailable={aggregates.saves.value === null} />}
            {activeIsYouTube ? <Metric label="Videos shown" value={String(posts.length)} detail="Published in selected period" unavailable={false} /> : <Metric label="Shares" value={formatMetric(aggregates.shares.value)} detail={metricAvailability(aggregates.shares, "posts")} unavailable={aggregates.shares.value === null} />}
          </section>

          <section className="pf-card mt-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="pf-section-title mt-1">{activeIsYouTube ? "Lifetime views by video publish date" : "Views across published posts"}</h2></div>
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><i className="size-2 rounded-full bg-[var(--pf-orange)]" />{activeIsYouTube ? "Provider-reported lifetime views" : "Reported views"}</span>
            </div>
            {chartPosts.length === 0 ? (
              <div className="grid h-52 place-items-center text-center"><div><BarChart3 className="mx-auto size-7 text-muted-foreground" /><p className="mt-2 text-[12px] text-muted-foreground">No posts in this range report view counts.</p></div></div>
            ) : (
              <div className="relative mt-3 h-56 overflow-hidden bg-[linear-gradient(var(--pf-border)_1px,transparent_1px)] bg-[size:100%_25%]">
                <svg viewBox="0 0 920 190" preserveAspectRatio="none" className="h-[190px] w-full overflow-visible" aria-label="Reported views trend">
                  <polyline points={points} fill="none" stroke="var(--pf-orange)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                  {chartPosts.map((post, index) => {
                    const x = chartPosts.length === 1 ? 50 : (index / (chartPosts.length - 1)) * 920;
                    const y = 180 - (post.metrics.views / maxViews) * 150;
                    return <circle key={post.id} cx={x} cy={y} r="4" fill="var(--pf-surface)" stroke="var(--pf-orange)" strokeWidth="3" />;
                  })}
                </svg>
                <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-muted-foreground"><span>{formatDate(chartPosts[0]?.publishedAt ?? null)}</span><span>{formatDate(chartPosts[chartPosts.length - 1]?.publishedAt ?? null)}</span></div>
              </div>
            )}
          </section>

          <PerformancePosts
            posts={posts}
            view={view}
            search={search}
            onSearch={setSearch}
            onView={setView}
            youtubeRawOnly={activeIsYouTube}
          />
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--pf-link)]"><Download className="size-3" /> Download CSV template</button>
        <div className="flex gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={importing} className="pf-button-secondary">{importing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Import local CSV</button>
          {csvDataset && <button type="button" onClick={clearCsvData} className="pf-button-secondary text-[var(--pf-danger)]"><Trash2 className="size-3.5" /> Clear CSV</button>}
        </div>
      </div>

      {toast && <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-[12px] font-medium text-background shadow-xl sm:left-auto sm:max-w-[420px]"><Check className="size-3.5 shrink-0 text-[var(--pf-success)]" /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span></div>}
    </div>
  );
}

function PerformancePosts({
  posts,
  view,
  search,
  onSearch,
  onView,
  youtubeRawOnly,
}: {
  posts: PerformancePostView[];
  view: "table" | "grid";
  search: string;
  onSearch: (value: string) => void;
  onView: (view: "table" | "grid") => void;
  youtubeRawOnly: boolean;
}) {
  return (
    <section className="pf-card mt-3 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="pf-section-title mt-1">What is working</h2></div>
        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          <label className="flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-white px-2"><Search className="size-3 text-muted-foreground" /><span className="sr-only">Search posts</span><input value={search} onChange={(event) => onSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[12px] outline-none sm:w-28" placeholder="Search posts" /></label>
          <div className="hidden rounded-[8px] bg-[var(--pf-active)] p-1 sm:flex"><button type="button" aria-label="Table view" aria-pressed={view === "table"} onClick={() => onView("table")} className={cn("grid size-6 place-items-center rounded-lg", view === "table" && "bg-white shadow-sm")}><List className="size-3" /></button><button type="button" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => onView("grid")} className={cn("grid size-6 place-items-center rounded-lg", view === "grid" && "bg-white shadow-sm")}><Grid2X2 className="size-3" /></button></div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="grid min-h-52 place-items-center text-center"><div><Search className="mx-auto size-6 text-muted-foreground" /><p className="mt-2 text-[12px] text-muted-foreground">No posts match this source, date range, and search.</p></div></div>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:hidden">{posts.map((post, index) => <PerformanceGridCard key={post.id} post={post} index={index} youtubeRawOnly={youtubeRawOnly} />)}</div>
          {view === "table" ? (
            <div className="mt-3 hidden overflow-x-auto sm:block"><div className="min-w-[700px]"><div className="grid grid-cols-[2fr_.75fr_.7fr_.8fr_.7fr] gap-3 px-2 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground"><span>Post</span><span>Published</span><span>Views</span><span>{youtubeRawOnly ? "Likes" : "Engagement"}</span><span>{youtubeRawOnly ? "Comments" : "Saves"}</span></div>{posts.map((post, index) => <PerformanceTableRow key={post.id} post={post} index={index} youtubeRawOnly={youtubeRawOnly} />)}</div></div>
          ) : (
            <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-2 xl:grid-cols-4">{posts.map((post, index) => <PerformanceGridCard key={post.id} post={post} index={index} youtubeRawOnly={youtubeRawOnly} />)}</div>
          )}
        </>
      )}
    </section>
  );
}

function PerformanceTableRow({ post, index, youtubeRawOnly }: { post: PerformancePostView; index: number; youtubeRawOnly: boolean }) {
  const rate = youtubeRawOnly ? null : postEngagementRate(post);
  return (
    <article className="grid min-h-16 grid-cols-[2fr_.75fr_.7fr_.8fr_.7fr] items-center gap-3 border-t border-border px-2 text-[11px] text-[var(--pf-muted)]">
      <div className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
        <PostThumbnail post={post} index={index} compact />
        <div className="min-w-0"><b className="block truncate text-[var(--pf-ink)]">{post.title}</b><span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">{post.provider && <SocialProviderIcon provider={post.provider} className="size-3" />}{post.provider ? accountHandle(post.accountUsername) : "Local CSV"}{post.permalink && <Link href={post.permalink} target="_blank" rel="noreferrer" aria-label={`Open ${post.title}`}><ExternalLink className="size-2.5" /></Link>}</span></div>
      </div>
      <span>{formatDate(post.publishedAt)}</span>
      <b className={cn("text-[var(--pf-ink)]", post.metrics.views === null && "font-normal text-muted-foreground")}>{formatMetric(post.metrics.views)}</b>
      <span className={cn((youtubeRawOnly ? post.metrics.likes : rate) === null && "text-muted-foreground")}>{youtubeRawOnly ? formatMetric(post.metrics.likes) : rate === null ? "—" : `${rate.toFixed(1)}%`}</span>
      <span className={cn((youtubeRawOnly ? post.metrics.comments : post.metrics.saves) === null && "text-muted-foreground")}>{formatMetric(youtubeRawOnly ? post.metrics.comments : post.metrics.saves)}</span>
    </article>
  );
}

function PerformanceGridCard({ post, index, youtubeRawOnly }: { post: PerformancePostView; index: number; youtubeRawOnly: boolean }) {
  return (
    <article className="rounded-lg border border-border p-2">
      <PostThumbnail post={post} index={index} />
      <div className="mt-2 flex items-center gap-1">{post.provider && <SocialProviderIcon provider={post.provider} className="size-3.5" />}<span className="truncate text-[11px] text-muted-foreground">{post.provider ? accountHandle(post.accountUsername) : "Local CSV"}</span></div>
      <h3 className="mt-1.5 truncate text-[13px] font-semibold">{post.title}</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">{youtubeRawOnly ? `${formatMetric(post.metrics.views)} views · ${formatMetric(post.metrics.likes)} likes · ${formatMetric(post.metrics.comments)} comments` : `${formatMetric(post.metrics.views)} views · ${formatMetric(post.metrics.saves)} saves`}</p>
      {post.permalink && <Link href={post.permalink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--pf-link)]">Open post <ExternalLink className="size-2.5" /></Link>}
    </article>
  );
}

function PostThumbnail({
  post,
  index,
  compact = false,
}: {
  post: PerformancePostView;
  index: number;
  compact?: boolean;
}) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const showThumbnail = Boolean(post.thumbnailUrl) && !thumbnailFailed;
  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden bg-[var(--pf-active)] text-muted-foreground", compact ? "h-11 w-9 rounded-md" : "h-32 w-full rounded-lg")}>
      {showThumbnail ? (
        // Provider thumbnails can expire; falling back keeps the post usable.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumbnailUrl ?? undefined} alt={`Thumbnail for ${post.title}`} onError={() => setThumbnailFailed(true)} className="size-full object-cover" />
      ) : post.provider ? <SocialProviderIcon provider={post.provider} className={compact ? "size-4" : "size-7"} /> : compact ? `0${index + 1}` : <FileSpreadsheet className="size-6" />}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
  unavailable,
}: {
  label: string;
  value: string;
  detail: string;
  unavailable: boolean;
}) {
  return (
    <article className="pf-card p-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <b className={cn("mt-2 block text-[20px] font-semibold tracking-[-0.02em] tabular-nums", unavailable && "text-muted-foreground")}>{value}</b>
      <small className="mt-1 block text-[12px] text-muted-foreground">{detail}</small>
    </article>
  );
}
