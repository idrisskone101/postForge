import { dayMonth } from "@/lib/day-month";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";
import type { PerformanceDataset } from "@/lib/performance/csv";
import {
  accountHandle,
  connectedAccountName,
  type ConnectedAccountView,
  type MetricAggregate,
  type PerformancePostView,
} from "@/lib/performance/metrics";
import type {
  PerformanceChartSeries,
  PerformanceMetricVariant,
  PerformanceRange,
  PerformanceSourceRow,
  PerformanceStatCell,
  PerformanceSyncWarning,
} from "./types";

type SourceAggregates = {
  views: MetricAggregate;
  likes: MetricAggregate;
  comments: MetricAggregate;
  saves: MetricAggregate;
  shares: MetricAggregate;
  engagementRate: MetricAggregate | null;
};

export const DASH = "-";
const PROVIDER_NAMES = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" } as const;
export const RANGES: readonly PerformanceRange[] = [7, 30, 90];

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const grouped = new Intl.NumberFormat("en");
const hourMinute = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

const PLOT_TOP = 8;
const PLOT_BASE = 142;
const PLOT_HEIGHT = 150;
const PLOT_WIDTH = 1000;

/** Unavailable stays a dash. Large counts compact, small ones keep every digit. */
export function metricText(value: number | null) {
  if (value === null) return DASH;
  return Math.abs(value) >= 10_000 ? compact.format(value) : grouped.format(value);
}

export function shortDate(value: string | null) {
  if (!value) return DASH;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? DASH : dayMonth.format(parsed);
}

export function rangeLabel(range: PerformanceRange, now: Date) {
  const start = new Date(now.valueOf() - range * 86_400_000);
  return `${dayMonth.format(start)} - ${dayMonth.format(now)}`;
}

export function performanceVariant(activeIsYouTube: boolean): PerformanceMetricVariant {
  return activeIsYouTube ? "youtube" : "default";
}

export function buildStatStripCells(
  variant: PerformanceMetricVariant,
  aggregates: SourceAggregates,
  postsInRange: number,
): PerformanceStatCell[] {
  const count: PerformanceStatCell = {
    label: variant === "youtube" ? "Videos" : "Posts",
    value: grouped.format(postsInRange),
    unavailable: false,
    coverage: null,
  };
  if (variant === "youtube") {
    return [
      metricCell("Lifetime views", aggregates.views),
      metricCell("Lifetime likes", aggregates.likes),
      metricCell("Lifetime comments", aggregates.comments),
      count,
    ];
  }
  return [
    metricCell("Views", aggregates.views),
    metricCell("Likes", aggregates.likes),
    metricCell("Comments", aggregates.comments),
    count,
    rateCell(aggregates.engagementRate),
  ];
}

function metricCell(label: string, aggregate: MetricAggregate): PerformanceStatCell {
  return {
    label,
    value: metricText(aggregate.value),
    unavailable: aggregate.value === null,
    coverage: coverage(aggregate),
  };
}

function rateCell(aggregate: MetricAggregate | null): PerformanceStatCell {
  const value = aggregate?.value ?? null;
  return {
    label: "Engagement rate",
    value: value === null ? DASH : `${value.toFixed(1)}%`,
    unavailable: value === null,
    coverage: aggregate ? coverage(aggregate) : null,
  };
}

function coverage(aggregate: MetricAggregate) {
  if (aggregate.total === 0 || aggregate.available === aggregate.total) return null;
  return `${aggregate.available} / ${aggregate.total} posts`;
}

/** Views per post, placed on the real time axis of the selected range. */
export function buildChartSeries(
  posts: PerformancePostView[],
  range: PerformanceRange,
  now: Date,
): PerformanceChartSeries {
  const end = now.valueOf();
  const start = end - range * 86_400_000;
  const xLabels: PerformanceChartSeries["xLabels"] = [
    dayMonth.format(start),
    dayMonth.format(start + (end - start) / 2),
    dayMonth.format(end),
  ];
  const points = posts
    .flatMap((post) => {
      const at = post.publishedAt ? new Date(post.publishedAt).valueOf() : NaN;
      return Number.isFinite(at) && post.metrics.views !== null
        ? [{ at, views: post.metrics.views }]
        : [];
    })
    .sort((a, b) => a.at - b.at);
  if (points.length === 0) {
    return { empty: true, path: "", current: null, yLabels: ["", "", "0"], xLabels };
  }
  const top = niceCeiling(Math.max(...points.map((point) => point.views)));
  const plotted = points.map((point) => ({
    x: clamp((point.at - start) / (end - start), 0, 1) * PLOT_WIDTH,
    y: PLOT_BASE - (point.views / top) * (PLOT_BASE - PLOT_TOP),
  }));
  const last = plotted[plotted.length - 1];
  return {
    empty: false,
    path: plotted
      .map((point, index) => `${index === 0 ? "M" : "L"}${round(point.x)} ${round(point.y)}`)
      .join(""),
    current: { left: (last.x / PLOT_WIDTH) * 100, top: (last.y / PLOT_HEIGHT) * 100 },
    yLabels: [compact.format(top), compact.format(top / 2), "0"],
    xLabels,
  };
}

function niceCeiling(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(
    (candidate) => candidate * magnitude >= value,
  );
  return (step ?? 10) * magnitude;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export function buildSourceRows(input: {
  statuses: PublicIntegrationStatus[];
  accounts: ConnectedAccountView[];
  csvDataset: PerformanceDataset | null;
  allowAllConnected: boolean;
}): PerformanceSourceRow[] {
  const rows: PerformanceSourceRow[] = [];
  if (input.allowAllConnected) {
    const count = input.accounts.filter((entry) => entry.provider !== "youtube").length;
    rows.push({
      kind: "all-connected",
      key: "all-connected",
      name: "All connected",
      sub: `${count} accounts, YouTube kept separate`,
    });
  }
  if (input.statuses.length === 0) {
    rows.push({ kind: "unavailable", key: "providers", name: "Social accounts" });
  }
  for (const status of input.statuses) {
    const accounts = input.accounts.filter((entry) => entry.provider === status.provider);
    if (accounts.length > 0) {
      rows.push(...accounts.map(accountRow));
    } else if (status.configuration === "not_configured") {
      rows.push({ kind: "unconfigured", key: status.provider, name: status.displayName });
    } else {
      rows.push({ kind: "disconnected", key: status.provider, name: status.displayName });
    }
  }
  rows.push(csvRow(input.csvDataset));
  return rows;
}

function sourceHandle(entry: ConnectedAccountView) {
  return entry.account.account.username
    ? accountHandle(entry.account.account.username)
    : connectedAccountName(entry.account);
}

/** The provider's own stored sync warnings, one per account, for the notices above the stats. */
export function buildSyncWarnings(accounts: ConnectedAccountView[]): PerformanceSyncWarning[] {
  return accounts.flatMap((entry) => {
    const text = entry.account.sync.warnings.join(" ").trim();
    if (!text) return [];
    return {
      key: entry.sourceKey,
      tone: entry.account.sync.status === "error" ? "bad" : "warn",
      lead: `${entry.status.displayName} ${sourceHandle(entry)}`,
      text,
    };
  });
}

function accountRow(entry: ConnectedAccountView): PerformanceSourceRow {
  const { authorization, sync } = entry.account;
  const handle = sourceHandle(entry);
  const synced = sync.lastSuccessfulAt ? syncedLabel(sync.lastSuccessfulAt) : "never synced";
  const health =
    authorization.status !== "healthy"
      ? "reconnect"
      : sync.status === "error"
        ? "failed"
        : sync.status === "partial"
          ? "partial"
          : sync.status === "never"
            ? "never"
            : "synced";
  return {
    kind: "account",
    key: entry.sourceKey,
    name: entry.status.displayName,
    sub: `${handle} - ${synced}`,
    health,
    entry,
  };
}

/** "synced 10:40" for a sync today in the reader's time zone, "last synced 9 Nov" before that. */
function syncedLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "sync time unavailable";
  return parsed.toDateString() === new Date().toDateString()
    ? `synced ${hourMinute.format(parsed)}`
    : `last synced ${dayMonth.format(parsed)}`;
}

function csvRow(dataset: PerformanceDataset | null): PerformanceSourceRow {
  if (!dataset) {
    return { kind: "csv-missing", key: "csv", name: "Local report", sub: "No CSV imported" };
  }
  const noun = dataset.posts.length === 1 ? "post" : "posts";
  return {
    kind: "csv",
    key: "csv",
    name: dataset.accountLabel,
    sub: `Local report - ${dataset.posts.length} ${noun}`,
  };
}

export function sourceLegend(activeSource: string, account: ConnectedAccountView | undefined) {
  if (activeSource === "csv") return "Local report";
  if (activeSource === "all-connected") return "All connected";
  return account ? account.status.displayName : "Views";
}

export function postSubline(post: PerformancePostView) {
  if (!post.provider) return "Local report";
  return `${PROVIDER_NAMES[post.provider]} - ${accountHandle(post.accountUsername)}`;
}
