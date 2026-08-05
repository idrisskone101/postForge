"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  fetchIntegrationPerformance,
  integrationAccountKey,
  syncIntegration,
  type ConnectedIntegrationAccountStatus,
  type IntegrationPerformanceResponse,
  type ProviderPostMetrics,
  type PublicIntegrationStatus,
  type SocialProvider,
} from "@/lib/integrations-client";
import {
  fetchWorkspaceFeature,
  removeWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import { cn } from "@/lib/utils";

export type CsvPostMetric = {
  id: string;
  title: string;
  views: number;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  publishedAt: string;
};

type PerformanceDataset = {
  id: string;
  source: "csv";
  accountLabel: string;
  importedAt: string;
  posts: CsvPostMetric[];
};

export type PerformancePostView = {
  id: string;
  source: "provider" | "csv";
  provider: SocialProvider | null;
  accountId: string | null;
  accountUsername: string | null;
  title: string;
  permalink: string | null;
  thumbnailUrl: string | null;
  mediaType: "video" | "image" | "carousel" | "short" | "unknown" | "report";
  publishedAt: string | null;
  metrics: ProviderPostMetrics;
};

export type MetricAggregate = {
  value: number | null;
  available: number;
  total: number;
};

const EMPTY_PROVIDER_PERFORMANCE: IntegrationPerformanceResponse = {
  providers: [],
  posts: [],
  lastUpdatedAt: null,
};

const formatCompact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function number(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const multiplier = normalized.endsWith("k")
    ? 1_000
    : normalized.endsWith("m")
      ? 1_000_000
      : 1;
  const parsed = Number.parseFloat(normalized.replace(/[km,]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * multiplier) : null;
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export function parsePerformanceCsv(csv: string): CsvPostMetric[] {
  const rows = parseCsvRows(csv.trim());
  if (rows.length < 2) throw new Error("The CSV needs a header and at least one post.");
  const headers = rows[0].map((value, index) =>
    (index === 0 ? value.replace(/^\uFEFF/, "") : value).trim().toLowerCase()
  );
  const required = ["title", "views", "publishedat"];
  if (!required.every((key) => headers.includes(key))) {
    throw new Error("Include title, views, and publishedAt columns.");
  }

  return rows.slice(1).map((cells, index) => {
    const get = (key: string) => cells[headers.indexOf(key)] ?? "";
    const optionalMetric = (key: string) => {
      const raw = get(key);
      if (!raw.trim()) return null;
      const parsed = number(raw);
      if (parsed === null || parsed < 0) {
        throw new Error(`Row ${index + 2} needs a non-negative numeric ${key} value.`);
      }
      return parsed;
    };
    const publishedAt = new Date(get("publishedat"));
    const views = number(get("views"));
    if (views === null || views < 0) {
      throw new Error(`Row ${index + 2} needs a non-negative numeric views value.`);
    }
    if (Number.isNaN(publishedAt.valueOf())) {
      throw new Error(`Row ${index + 2} needs a valid publishedAt date.`);
    }
    return {
      id: `metric_${Date.now()}_${index}`,
      title: get("title") || `Post ${index + 1}`,
      views,
      likes: optionalMetric("likes"),
      comments: optionalMetric("comments"),
      shares: optionalMetric("shares"),
      saves: optionalMetric("saves"),
      publishedAt: publishedAt.toISOString(),
    };
  });
}

export function aggregateMetric(
  posts: PerformancePostView[],
  key: keyof Pick<
    ProviderPostMetrics,
    "views" | "likes" | "comments" | "shares" | "saves" | "reach" | "watchTimeMinutes"
  >
): MetricAggregate {
  const reported = posts
    .map((post) => post.metrics[key])
    .filter((value): value is number => value !== null);
  return {
    value: reported.length > 0
      ? reported.reduce((sum, value) => sum + value, 0)
      : null,
    available: reported.length,
    total: posts.length,
  };
}

export function aggregateEngagementRate(posts: PerformancePostView[]): MetricAggregate {
  const eligible = posts.filter((post) =>
    [
      post.metrics.views,
      post.metrics.likes,
      post.metrics.comments,
      post.metrics.shares,
    ].every((value) => value !== null) && (post.metrics.views ?? 0) > 0
  );
  if (eligible.length === 0) {
    return { value: null, available: 0, total: posts.length };
  }
  const views = eligible.reduce((sum, post) => sum + (post.metrics.views as number), 0);
  const engagements = eligible.reduce(
    (sum, post) =>
      sum +
      (post.metrics.likes as number) +
      (post.metrics.comments as number) +
      (post.metrics.shares as number),
    0
  );
  return {
    value: views > 0 ? (engagements / views) * 100 : null,
    available: eligible.length,
    total: posts.length,
  };
}

function csvPostToView(post: CsvPostMetric): PerformancePostView {
  return {
    id: post.id,
    source: "csv",
    provider: null,
    accountId: null,
    accountUsername: null,
    title: post.title,
    permalink: null,
    thumbnailUrl: null,
    mediaType: "report",
    publishedAt: post.publishedAt,
    metrics: {
      views: post.views,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      saves: post.saves,
      reach: null,
      watchTimeMinutes: null,
    },
  };
}

function providerPostToView(
  post: IntegrationPerformanceResponse["posts"][number]
): PerformancePostView {
  return {
    ...post,
    source: "provider",
    title: post.title || `${providerDisplayName(post.provider)} ${post.mediaType}`,
  };
}

function providerDisplayName(provider: SocialProvider) {
  return provider === "youtube"
    ? "YouTube"
    : provider[0].toUpperCase() + provider.slice(1);
}

function connectedAccountName(account: ConnectedIntegrationAccountStatus) {
  return (
    account.account.displayName ||
    (account.account.username
      ? accountHandle(account.account.username)
      : "Connected account")
  );
}

export type ConnectedAccountView = {
  provider: SocialProvider;
  status: PublicIntegrationStatus;
  account: ConnectedIntegrationAccountStatus;
  sourceKey: string;
};

function accountHandle(username: string | null) {
  return username
    ? username.startsWith("@")
      ? username
      : `@${username}`
    : "Username unavailable";
}

export function canAggregateConnectedProviders(
  providers: Array<{ provider: SocialProvider }>
) {
  return providers.filter((status) => status.provider !== "youtube").length >= 2;
}

export function canDerivePerformanceMetrics(
  provider: SocialProvider | null | undefined
) {
  return provider !== "youtube";
}

export function aggregatePerformanceSource(
  posts: PerformancePostView[],
  provider: SocialProvider | null | undefined
) {
  return {
    views: aggregateMetric(posts, "views"),
    likes: aggregateMetric(posts, "likes"),
    comments: aggregateMetric(posts, "comments"),
    saves: aggregateMetric(posts, "saves"),
    shares: aggregateMetric(posts, "shares"),
    engagementRate: canDerivePerformanceMetrics(provider)
      ? aggregateEngagementRate(posts)
      : null,
  };
}

function formatMetric(value: number | null) {
  return value === null ? "—" : formatCompact.format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? "Date unavailable"
    : parsed.toLocaleDateString();
}

function formatSyncDate(value: string | null) {
  if (!value) return "Never synced";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "Sync time unavailable";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function metricAvailability(aggregate: MetricAggregate, noun: string) {
  if (aggregate.total === 0) return "No posts in range";
  if (aggregate.available === aggregate.total) return `${aggregate.total} ${noun} in range`;
  return `${aggregate.available} of ${aggregate.total} ${noun} report this metric`;
}

export function PerformancePageClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [csvDataset, setCsvDataset] = useState<PerformanceDataset | null>(null);
  const [providerData, setProviderData] = useState<IntegrationPerformanceResponse>(
    EMPTY_PROVIDER_PERFORMANCE
  );
  const [selectedSource, setSelectedSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const loadProviderData = useCallback(async () => {
    setProviderError(null);
    try {
      const response = await fetchIntegrationPerformance();
      setProviderData(response);
      return response;
    } catch (cause) {
      setProviderError(
        cause instanceof Error
          ? cause.message
          : "Unable to load connected account performance"
      );
      return null;
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLocalError(null);
    await Promise.all([
      loadProviderData(),
      fetchWorkspaceFeature<PerformanceDataset>("connections")
        .then(({ records }) => {
          const saved = records.find(
            (record) => record.id === "performance-dataset" && record.source === "csv"
          );
          setCsvDataset(saved ?? null);
        })
        .catch((cause) => {
          setLocalError(
            cause instanceof Error ? cause.message : "Unable to load imported CSV data"
          );
        }),
    ]);
    setLoading(false);
  }, [loadProviderData]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const connectedAccounts = useMemo<ConnectedAccountView[]>(
    () =>
      providerData.providers.flatMap((status) =>
        status.connected
          ? status.accounts.map((account) => ({
              provider: status.provider,
              status,
              account,
              sourceKey: integrationAccountKey(status.provider, account.account.id),
            }))
          : []
      ),
    [providerData.providers]
  );

  const sourceOptions = useMemo(() => {
    const options = connectedAccounts.map((account) => account.sourceKey);
    if (canAggregateConnectedProviders(connectedAccounts)) {
      options.unshift("all-connected");
    }
    if (csvDataset) options.push("csv");
    return options;
  }, [connectedAccounts, csvDataset]);

  useEffect(() => {
    if (sourceOptions.includes(selectedSource)) return;
    setSelectedSource(sourceOptions[0] ?? "");
  }, [selectedSource, sourceOptions]);

  const activeSource = sourceOptions.includes(selectedSource)
    ? selectedSource
    : sourceOptions[0] ?? "";

  const activeAccount = connectedAccounts.find(
    (account) => account.sourceKey === activeSource
  );
  const activeIsYouTube = activeAccount?.provider === "youtube";

  const sourcePosts = useMemo(() => {
    if (activeSource === "csv") {
      return (csvDataset?.posts ?? []).map(csvPostToView);
    }
    const connectedKeys = new Set(
      connectedAccounts.map((account) => account.sourceKey)
    );
    return providerData.posts
      .filter((post) => {
        const key = integrationAccountKey(post.provider, post.accountId);
        return activeSource === "all-connected"
          ? post.provider !== "youtube" && connectedKeys.has(key)
          : key === activeSource;
      })
      .map(providerPostToView);
  }, [activeSource, connectedAccounts, csvDataset, providerData.posts]);

  const posts = useMemo(() => {
    const threshold = Date.now() - range * 86_400_000;
    const query = search.trim().toLowerCase();
    return sourcePosts
      .filter((post) => {
        if (!post.publishedAt) return false;
        const publishedAt = new Date(post.publishedAt).valueOf();
        return Number.isFinite(publishedAt) && publishedAt >= threshold;
      })
      .filter((post) => post.title.toLowerCase().includes(query))
      .sort((a, b) => {
        if (activeIsYouTube) {
          return (
            new Date(b.publishedAt ?? 0).valueOf() -
            new Date(a.publishedAt ?? 0).valueOf()
          );
        }
        if (a.metrics.views === null && b.metrics.views === null) return 0;
        if (a.metrics.views === null) return 1;
        if (b.metrics.views === null) return -1;
        return b.metrics.views - a.metrics.views;
      });
  }, [activeIsYouTube, range, search, sourcePosts]);

  const excludedUnknownDates = sourcePosts.filter((post) => !post.publishedAt).length;
  const aggregates = useMemo(
    () => aggregatePerformanceSource(posts, activeAccount?.provider),
    [activeAccount?.provider, posts]
  );

  const accountAggregates = useMemo(
    () =>
      connectedAccounts.map((entry) => {
        const key = entry.sourceKey;
        const accountPosts = providerData.posts.filter(
          (post) => integrationAccountKey(post.provider, post.accountId) === key
        );
        return {
          ...entry,
          aggregate: aggregatePerformanceSource(
            accountPosts.map(providerPostToView),
            entry.provider
          ),
        };
      }),
    [connectedAccounts, providerData.posts]
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1900);
  }

  async function importFile(file: File) {
    setImporting(true);
    setLocalError(null);
    try {
      const parsed = parsePerformanceCsv(await file.text());
      const next: PerformanceDataset = {
        id: "performance-dataset",
        source: "csv",
        accountLabel: file.name,
        importedAt: new Date().toISOString(),
        posts: parsed,
      };
      await saveWorkspaceFeature("connections", next);
      setCsvDataset(next);
      setSelectedSource("csv");
      notify(`${parsed.length} local CSV posts imported`);
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "Unable to import CSV");
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function downloadTemplate() {
    const sample =
      "title,views,likes,comments,shares,saves,publishedAt\nMy post,12000,840,62,91,430,2026-08-01";
    const url = URL.createObjectURL(new Blob([sample], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "postforge-performance-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    notify("CSV template downloaded");
  }

  async function clearCsvData() {
    if (!csvDataset) return;
    if (!window.confirm("Remove only the imported CSV dataset? Connected account data will remain available.")) return;
    try {
      await removeWorkspaceFeature("connections", "performance-dataset");
      setCsvDataset(null);
      notify("Imported CSV data removed");
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "Unable to remove CSV data");
    }
  }

  async function syncAccounts(targets: ConnectedAccountView[]) {
    const unique = new Map<string, ConnectedAccountView>();
    for (const target of targets) {
      unique.set(
        `${target.provider}:${target.account.account.id}`,
        target
      );
    }
    if (unique.size === 0) return;
    setProviderError(null);
    const failures: string[] = [];
    try {
      for (const target of unique.values()) {
        setBusyProvider(target.provider);
        try {
          await syncIntegration(
            target.provider,
            target.account.account.id
          );
        } catch {
          failures.push(
            connectedAccountName(target.account) || providerDisplayName(target.provider)
          );
        }
      }
    } finally {
      await loadProviderData();
      setBusyProvider(null);
    }
    if (failures.length > 0) {
      setProviderError(
        `${failures.join(", ")} could not be synced. Other connected accounts were still attempted.`
      );
    } else {
      notify(
        unique.size === 1
          ? `${connectedAccountName([...unique.values()][0].account)} synced`
          : `${unique.size} connected accounts synced`
      );
    }
  }

  const syncTargets = useMemo(() => {
    if (activeSource === "all-connected") {
      return connectedAccounts.filter(
        (entry) =>
          entry.provider !== "youtube" &&
          entry.account.authorization.status === "healthy"
      );
    }
    return activeAccount &&
      activeAccount.account.authorization.status === "healthy"
      ? [activeAccount]
      : [];
  }, [activeAccount, activeSource, connectedAccounts]);

  if (loading) {
    return (
      <div className="grid min-h-[520px] place-items-center">
        <Loader2 className="size-6 animate-spin text-[#FF4A20]" />
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
        <div role="alert" className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-[9px] border border-[#F0B5AA] bg-[#FFF6F4] px-3 py-2 text-[10px] text-[#B83F2D]">
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
              <p className="pf-eyebrow">Accounts</p>
              <h2 className="mt-1 text-[13px] font-semibold">Performance by account</h2>
              <div className="mt-2 grid gap-2 min-[1100px]:grid-cols-2 min-[1400px]:grid-cols-3">
                {accountAggregates.map((entry) => (
                  <article key={entry.sourceKey} className="rounded-[9px] border border-[#DEDFD8] p-2.5">
                    <div className="flex items-center gap-2">
                      <SocialProviderIcon provider={entry.provider} className="size-6 shrink-0" />
                      <div className="min-w-0">
                        <b className="block truncate text-[10px]">{connectedAccountName(entry.account)}</b>
                        <span className="block truncate text-[9px] text-[#858681]">{entry.account.account.username ? accountHandle(entry.account.account.username) : entry.status.displayName}</span>
                      </div>
                      {entry.account.authorization.status !== "healthy" && (
                        <Link href="/settings?tab=integrations" className="ml-auto rounded-full border border-[#E4C0B8] bg-white px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[.05em] text-[#B83F2D]">Reconnect</Link>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5 border-t border-[#E9EAE4] pt-2">
                      {([
                        ["Views", entry.aggregate.views.value],
                        ["Likes", entry.aggregate.likes.value],
                        ["Comments", entry.aggregate.comments.value],
                        ["Shares", entry.aggregate.shares.value],
                        ["Saves", entry.aggregate.saves.value],
                        ["Posts", entry.aggregate.views.total],
                      ] as const).map(([label, value]) => (
                        <div key={label}>
                          <span className="block text-[8px] font-bold uppercase tracking-[.07em] text-[#999A95]">{label}</span>
                          <b className="mt-0.5 block font-mono text-[11px] tabular-nums">{value === null ? "—" : formatCompact.format(value)}</b>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeIsYouTube && (
            <p className="mt-3 min-w-0 break-words rounded-[8px] border border-[#BED3EF] bg-[#F4F8FE] px-3 py-2 text-[10px] leading-4 text-[#476785] [overflow-wrap:anywhere]">
              7/30/90 days selects videos published in that period. Views, likes, and comments are each video&apos;s current lifetime counters, not activity during the selected period. YouTube data is never mixed with another source or converted into a derived engagement rate.
            </p>
          )}

          <section className="mt-4 flex flex-col justify-between gap-3 border-b border-[#DEDFD8] pb-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="pf-eyebrow">Active data</p>
              <h2 className="mt-1 min-w-0 break-words text-[14px] font-semibold [overflow-wrap:anywhere]">
                {activeSource === "csv"
                  ? csvDataset?.accountLabel
                  : activeSource === "all-connected"
                    ? "All connected non-YouTube accounts"
                    : activeAccount ? connectedAccountName(activeAccount.account) : "Connected account"}
              </h2>
              <p className="mt-1 min-w-0 break-words text-[10px] text-[#858681] [overflow-wrap:anywhere]">
                {activeSource === "csv"
                  ? `Local CSV · imported ${csvDataset ? formatSyncDate(csvDataset.importedAt) : ""}`
                  : `${activeIsYouTube ? "YouTube API data" : "Provider-owned data"} · ${sourcePosts.length} post${sourcePosts.length === 1 ? "" : "s"} · no estimated metrics`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-[8px] bg-[#E8E9E2] p-1" aria-label="Performance date range">
                {([7, 30, 90] as const).map((days) => (
                  <button key={days} type="button" aria-pressed={range === days} onClick={() => setRange(days)} className={cn("h-7 rounded-[6px] px-2 text-[10px] text-[#777873]", range === days && "bg-white font-semibold text-[#232323] shadow-sm")}>{days} days</button>
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
            <p className="mt-3 rounded-[8px] border border-[#E6D39A] bg-[#FFF9E8] px-3 py-2 text-[10px] text-[#806620]">
              {excludedUnknownDates} provider-owned post{excludedUnknownDates === 1 ? " is" : "s are"} excluded from date ranges because the provider did not supply a publish date.
            </p>
          )}

          {<section className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
            <Metric label="Total views" value={formatMetric(aggregates.views.value)} detail={activeIsYouTube ? `Lifetime counters · ${metricAvailability(aggregates.views, "videos")}` : metricAvailability(aggregates.views, "posts")} unavailable={aggregates.views.value === null} />
            {activeIsYouTube ? <Metric label="Total likes" value={formatMetric(aggregates.likes.value)} detail={`Lifetime counters · ${metricAvailability(aggregates.likes, "videos")}`} unavailable={aggregates.likes.value === null} /> : <Metric label="Engagement rate" value={aggregates.engagementRate?.value === null ? "—" : `${aggregates.engagementRate!.value!.toFixed(1)}%`} detail={metricAvailability(aggregates.engagementRate!, "posts")} unavailable={aggregates.engagementRate?.value === null} />}
            {activeIsYouTube ? <Metric label="Total comments" value={formatMetric(aggregates.comments.value)} detail={`Lifetime counters · ${metricAvailability(aggregates.comments, "videos")}`} unavailable={aggregates.comments.value === null} /> : <Metric label="Saves" value={formatMetric(aggregates.saves.value)} detail={metricAvailability(aggregates.saves, "posts")} unavailable={aggregates.saves.value === null} />}
            {activeIsYouTube ? <Metric label="Videos shown" value={String(posts.length)} detail="Published in selected period" unavailable={false} /> : <Metric label="Shares" value={formatMetric(aggregates.shares.value)} detail={metricAvailability(aggregates.shares, "posts")} unavailable={aggregates.shares.value === null} />}
          </section>}

          {<section className="pf-card mt-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="pf-eyebrow">{activeIsYouTube ? "By publish date" : "Daily trend"}</p><h2 className="pf-section-title mt-1">{activeIsYouTube ? "Lifetime views by video publish date" : "Views across published posts"}</h2></div>
              <span className="flex items-center gap-1.5 text-[10px] text-[#858681]"><i className="size-2 rounded-full bg-[#FF4A20]" />{activeIsYouTube ? "Provider-reported lifetime views" : "Reported views"}</span>
            </div>
            {chartPosts.length === 0 ? (
              <div className="grid h-52 place-items-center text-center"><div><BarChart3 className="mx-auto size-7 text-[#B0B1AC]" /><p className="mt-2 text-[10px] text-[#858681]">No posts in this range report view counts.</p></div></div>
            ) : (
              <div className="relative mt-3 h-56 overflow-hidden bg-[linear-gradient(#ECECE7_1px,transparent_1px)] bg-[size:100%_25%]">
                <svg viewBox="0 0 920 190" preserveAspectRatio="none" className="h-[190px] w-full overflow-visible" aria-label="Reported views trend">
                  <polyline points={points} fill="none" stroke="#FF4A20" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                  {chartPosts.map((post, index) => {
                    const x = chartPosts.length === 1 ? 50 : (index / (chartPosts.length - 1)) * 920;
                    const y = 180 - (post.metrics.views / maxViews) * 150;
                    return <circle key={post.id} cx={x} cy={y} r="4" fill="#fff" stroke="#FF4A20" strokeWidth="3" />;
                  })}
                </svg>
                <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] text-[#AAA]"><span>{formatDate(chartPosts[0]?.publishedAt ?? null)}</span><span>{formatDate(chartPosts[chartPosts.length - 1]?.publishedAt ?? null)}</span></div>
              </div>
            )}
          </section>}

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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#DEDFD8] pt-4">
        <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#378EFF]"><Download className="size-3" /> Download CSV template</button>
        <div className="flex gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={importing} className="pf-button-secondary">{importing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Import local CSV</button>
          {csvDataset && <button type="button" onClick={clearCsvData} className="pf-button-secondary text-[#B83F2D]"><Trash2 className="size-3.5" /> Clear CSV</button>}
        </div>
      </div>

      {toast && <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-[9px] bg-[#232323] px-3 py-2.5 text-[10px] font-medium text-white shadow-xl sm:left-auto sm:max-w-[420px]"><Check className="size-3.5 shrink-0 text-[#69D583]" /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span></div>}
    </div>
  );
}

function PerformanceEmptyState({
  importing,
  onImport,
  onDownloadTemplate,
  providerUnavailable,
}: {
  importing: boolean;
  onImport: () => void;
  onDownloadTemplate: () => void;
  providerUnavailable: boolean;
}) {
  return (
    <section data-workspace-state="empty" className="pf-card pf-empty-stage flex min-h-[570px] flex-col items-center justify-center p-6 text-center">
      <div className="grid size-14 place-items-center rounded-[14px] bg-[#232323] text-white"><BarChart3 className="size-6" /></div>
      <p className="pf-eyebrow mt-5">No performance source</p>
      <h2 className="mt-2 text-[23px] font-semibold tracking-[-0.04em]">Connect an account or import a local report</h2>
      <p className="mt-2 max-w-[500px] text-[10px] leading-5 text-[#7F807B]">PostForge never invents performance data. Connected accounts use provider-owned posts; CSV remains a separate local dataset.</p>
      {providerUnavailable && <p className="mt-3 text-[11px] font-medium text-[#B83F2D]">Connected account status is currently unavailable. CSV import still works locally.</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2"><Link href="/settings?tab=integrations" className="pf-button-primary">Open integrations</Link><button type="button" onClick={onImport} disabled={importing} className="pf-button-secondary">{importing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Import CSV</button></div>
      <button type="button" onClick={onDownloadTemplate} className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#378EFF]"><Download className="size-3" /> Download CSV template</button>
      <div className="mt-7 max-w-full rounded-[9px] border border-[#BED3EF] bg-[#F4F8FE] px-4 py-3 text-left text-[11px] text-[var(--pf-muted)]"><b className="text-[var(--pf-ink)]">Expected columns</b><p className="mt-1 break-words font-mono [overflow-wrap:anywhere]">title, views, likes, comments, shares, saves, publishedAt</p></div>
    </section>
  );
}

function PerformanceSourcePanel({
  providers,
  csvDataset,
  selectedSource,
  busyProvider,
  lastUpdatedAt,
  onSelect,
  onSync,
  onImport,
  onClearCsv,
}: {
  providers: ConnectedAccountView[];
  csvDataset: PerformanceDataset | null;
  selectedSource: string;
  busyProvider: SocialProvider | null;
  lastUpdatedAt: string | null;
  onSelect: (source: string) => void;
  onSync: (entry: ConnectedAccountView) => void;
  onImport: () => void;
  onClearCsv: () => void;
}) {
  const allowAllConnected = canAggregateConnectedProviders(providers);
  return (
    <section className="pf-card p-4" aria-labelledby="performance-sources-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="pf-eyebrow">Data sources</p><h2 id="performance-sources-title" className="pf-section-title mt-1">Connected accounts and local reports</h2><p className="mt-1 text-[10px] text-[#858681]">Provider data last refreshed {formatSyncDate(lastUpdatedAt)}</p></div>
        <label className="block w-full sm:w-72"><span className="mb-1 block text-[10px] font-semibold text-[#666762]">Active performance source</span><select aria-label="Active performance source" value={selectedSource} onChange={(event) => onSelect(event.target.value)} className="h-9 w-full rounded-[8px] border border-[#D7D8D0] bg-white px-3 text-[11px] outline-none focus:border-[#FF4A20]">
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
            <article key={key} data-performance-account={key} className={cn("grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 rounded-[9px] border p-2.5", selected ? "border-[#AFC8EB] bg-[#F7FAFF]" : "border-[#E0E1DA] bg-[#FAFAF8]") }>
              <SocialProviderIcon provider={entry.provider} label={`${entry.status.displayName} logo`} className="size-8" />
              <div className="min-w-0"><b className="block truncate text-[11px]">{connectedAccountName(entry.account)}</b><p className="mt-0.5 truncate text-[9px] text-[#858681]">{accountHandle(entry.account.account.username)} · {entry.account.authorization.status !== "healthy" ? "Reconnect required" : entry.account.sync.status === "error" ? "Sync error" : entry.account.sync.status === "partial" ? "Partial metrics" : formatSyncDate(entry.account.sync.lastSuccessfulAt)}</p></div>
              {entry.account.authorization.status !== "healthy" ? (
                <Link href="/settings?tab=integrations" aria-label={`Reconnect ${entry.status.displayName} account ${accountHandle(entry.account.account.username)}`} className="grid size-8 place-items-center rounded-[7px] border border-[#E4C0B8] bg-white text-[#B83F2D]"><ExternalLink className="size-3.5" /></Link>
              ) : (
                <button type="button" onClick={() => onSync(entry)} disabled={busyProvider !== null} aria-label={`Sync ${entry.status.displayName} account ${accountHandle(entry.account.account.username)}`} className="grid size-8 place-items-center rounded-[7px] border border-[#D7D8D0] bg-white text-[#555651] disabled:opacity-50">{busyProvider === entry.provider ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}</button>
              )}
            </article>
          );
        })}
        {csvDataset && (
          <article data-performance-account="csv" className={cn("grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 rounded-[9px] border p-2.5", selectedSource === "csv" ? "border-[#AFC8EB] bg-[#F7FAFF]" : "border-[#E0E1DA] bg-[#FAFAF8]") }>
            <span className="grid size-8 place-items-center rounded-[8px] bg-[#232323] text-white"><FileSpreadsheet className="size-3.5" /></span>
            <div className="min-w-0"><b className="block truncate text-[11px]">{csvDataset.accountLabel}</b><p className="mt-0.5 truncate text-[9px] text-[#858681]">Local CSV · {csvDataset.posts.length} posts</p></div>
            <div className="flex gap-1"><button type="button" onClick={onImport} aria-label="Replace local CSV" className="grid size-8 place-items-center rounded-[7px] border border-[#D7D8D0] bg-white"><Upload className="size-3.5" /></button><button type="button" onClick={onClearCsv} aria-label="Clear local CSV" className="grid size-8 place-items-center rounded-[7px] border border-[#E4C0B8] bg-white text-[#B83F2D]"><Trash2 className="size-3.5" /></button></div>
          </article>
        )}
      </div>
    </section>
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
        <div><p className="pf-eyebrow">Content</p><h2 className="pf-section-title mt-1">What is working</h2></div>
        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          <label className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#D8D9D2] bg-white px-2"><Search className="size-3 text-[#92938E]" /><span className="sr-only">Search posts</span><input value={search} onChange={(event) => onSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[10px] outline-none sm:w-28" placeholder="Search posts" /></label>
          <div className="hidden rounded-[8px] bg-[#EFF0EA] p-1 sm:flex"><button type="button" aria-label="Table view" aria-pressed={view === "table"} onClick={() => onView("table")} className={cn("grid size-6 place-items-center rounded-[5px]", view === "table" && "bg-white shadow-sm")}><List className="size-3" /></button><button type="button" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => onView("grid")} className={cn("grid size-6 place-items-center rounded-[5px]", view === "grid" && "bg-white shadow-sm")}><Grid2X2 className="size-3" /></button></div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="grid min-h-52 place-items-center text-center"><div><Search className="mx-auto size-6 text-[#B0B1AC]" /><p className="mt-2 text-[10px] text-[#858681]">No posts match this source, date range, and search.</p></div></div>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:hidden">{posts.map((post, index) => <PerformanceGridCard key={post.id} post={post} index={index} youtubeRawOnly={youtubeRawOnly} />)}</div>
          {view === "table" ? (
            <div className="mt-3 hidden overflow-x-auto sm:block"><div className="min-w-[700px]"><div className="grid grid-cols-[2fr_.75fr_.7fr_.8fr_.7fr] gap-3 px-2 py-2 text-[9px] font-bold uppercase tracking-[.08em] text-[#999]"><span>Post</span><span>Published</span><span>Views</span><span>{youtubeRawOnly ? "Likes" : "Engagement"}</span><span>{youtubeRawOnly ? "Comments" : "Saves"}</span></div>{posts.map((post, index) => <PerformanceTableRow key={post.id} post={post} index={index} youtubeRawOnly={youtubeRawOnly} />)}</div></div>
          ) : (
            <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-2 xl:grid-cols-4">{posts.map((post, index) => <PerformanceGridCard key={post.id} post={post} index={index} youtubeRawOnly={youtubeRawOnly} />)}</div>
          )}
        </>
      )}
    </section>
  );
}

export function postEngagementRate(post: PerformancePostView) {
  if (post.provider === "youtube") return null;
  const { views, likes, comments, shares } = post.metrics;
  if ([views, likes, comments, shares].some((value) => value === null) || !views) return null;
  return (((likes as number) + (comments as number) + (shares as number)) / views) * 100;
}

function PerformanceTableRow({ post, index, youtubeRawOnly }: { post: PerformancePostView; index: number; youtubeRawOnly: boolean }) {
  const rate = youtubeRawOnly ? null : postEngagementRate(post);
  return (
    <article className="grid min-h-16 grid-cols-[2fr_.75fr_.7fr_.8fr_.7fr] items-center gap-3 border-t border-[#E9EAE4] px-2 text-[11px] text-[var(--pf-muted)]">
      <div className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
        <PostThumbnail post={post} index={index} compact />
        <div className="min-w-0"><b className="block truncate text-[var(--pf-ink)]">{post.title}</b><span className="mt-0.5 flex items-center gap-1 text-[9px] text-[#92938E]">{post.provider && <SocialProviderIcon provider={post.provider} className="size-3" />}{post.provider ? accountHandle(post.accountUsername) : "Local CSV"}{post.permalink && <Link href={post.permalink} target="_blank" rel="noreferrer" aria-label={`Open ${post.title}`}><ExternalLink className="size-2.5" /></Link>}</span></div>
      </div>
      <span>{formatDate(post.publishedAt)}</span>
      <b className={cn("text-[var(--pf-ink)]", post.metrics.views === null && "font-normal text-[#AAA]")}>{formatMetric(post.metrics.views)}</b>
      <span className={cn((youtubeRawOnly ? post.metrics.likes : rate) === null && "text-[#AAA]")}>{youtubeRawOnly ? formatMetric(post.metrics.likes) : rate === null ? "—" : `${rate.toFixed(1)}%`}</span>
      <span className={cn((youtubeRawOnly ? post.metrics.comments : post.metrics.saves) === null && "text-[#AAA]")}>{formatMetric(youtubeRawOnly ? post.metrics.comments : post.metrics.saves)}</span>
    </article>
  );
}

function PerformanceGridCard({ post, index, youtubeRawOnly }: { post: PerformancePostView; index: number; youtubeRawOnly: boolean }) {
  return (
    <article className="rounded-[9px] border border-[#DEDFD8] p-2">
      <PostThumbnail post={post} index={index} />
      <div className="mt-2 flex items-center gap-1">{post.provider && <SocialProviderIcon provider={post.provider} className="size-3.5" />}<span className="truncate text-[9px] text-[#858681]">{post.provider ? accountHandle(post.accountUsername) : "Local CSV"}</span></div>
      <h3 className="mt-1.5 truncate text-[11px] font-semibold">{post.title}</h3>
      <p className="mt-1 text-[9px] text-[#858681]">{youtubeRawOnly ? `${formatMetric(post.metrics.views)} views · ${formatMetric(post.metrics.likes)} likes · ${formatMetric(post.metrics.comments)} comments` : `${formatMetric(post.metrics.views)} views · ${formatMetric(post.metrics.saves)} saves`}</p>
      {post.permalink && <Link href={post.permalink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-[#378EFF]">Open post <ExternalLink className="size-2.5" /></Link>}
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
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden text-white", compact ? "h-11 w-9 rounded-[6px]" : "h-32 w-full rounded-[7px]", ["bg-[#FF6846]", "bg-[#4A83C7]", "bg-[#43885F]", "bg-[#C99535]"][index % 4])}>
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
      <span className="pf-eyebrow !text-[9px]">{label}</span>
      <b className={cn("mt-2 block text-[23px] tracking-[-.04em]", unavailable && "text-[#9A9B96]")}>{value}</b>
      <small className="mt-1 block text-[10px] text-[#8D8E89]">{detail}</small>
    </article>
  );
}
