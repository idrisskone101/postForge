import {
  formatDate,
  formatMetric,
  formatSyncDate,
  metricAvailability,
} from "@/lib/performance/format";
import type { PerformancePostView } from "@/lib/performance/metrics";
import type {
  PerformanceChartSeries,
  PerformanceMetricVariant,
  PerformanceSourceHeading,
  PerformanceStatCell,
} from "./types";

type SourceAggregates = {
  views: { value: number | null; available: number; total: number };
  likes: { value: number | null; available: number; total: number };
  comments: { value: number | null; available: number; total: number };
  saves: { value: number | null; available: number; total: number };
  shares: { value: number | null; available: number; total: number };
  engagementRate: {
    value: number | null;
    available: number;
    total: number;
  } | null;
};

export const CHART_COPY: Record<
  PerformanceMetricVariant,
  { title: string; legendLabel: string }
> = {
  youtube: {
    title: "Lifetime views by video publish date",
    legendLabel: "Provider-reported lifetime views",
  },
  default: {
    title: "Views across published posts",
    legendLabel: "Reported views",
  },
};

export const POSTS_COLUMN_HEADERS: Record<
  PerformanceMetricVariant,
  { engagement: string; trailing: string }
> = {
  youtube: { engagement: "Likes", trailing: "Comments" },
  default: { engagement: "Engagement", trailing: "Saves" },
};

const CHART_WIDTH = 920;
const CHART_BASELINE = 180;
const CHART_HEIGHT = 150;
const SINGLE_POINT_X = 50;

export function performanceVariant(
  activeIsYouTube: boolean
): PerformanceMetricVariant {
  return activeIsYouTube ? "youtube" : "default";
}

export function buildStatStripCells(input: {
  variant: PerformanceMetricVariant;
  aggregates: SourceAggregates;
  postsInRange: number;
}): [
  PerformanceStatCell,
  PerformanceStatCell,
  PerformanceStatCell,
  PerformanceStatCell,
] {
  const { variant, aggregates, postsInRange } = input;
  switch (variant) {
    case "youtube":
      return [
        metricCell("Total views", aggregates.views, "videos", true),
        metricCell("Total likes", aggregates.likes, "videos", true),
        metricCell("Total comments", aggregates.comments, "videos", true),
        {
          label: "Videos shown",
          value: String(postsInRange),
          detail: "Published in selected period",
          unavailable: false,
        },
      ];
    case "default":
      return [
        metricCell("Total views", aggregates.views, "posts", false),
        engagementCell(aggregates.engagementRate),
        metricCell("Saves", aggregates.saves, "posts", false),
        metricCell("Shares", aggregates.shares, "posts", false),
      ];
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

export function buildChartSeries(
  posts: PerformancePostView[]
): PerformanceChartSeries {
  const chartPosts = [...posts]
    .filter(
      (
        post
      ): post is PerformancePostView & {
        publishedAt: string;
        metrics: PerformancePostView["metrics"] & { views: number };
      } => post.publishedAt !== null && post.metrics.views !== null
    )
    .sort(
      (a, b) =>
        new Date(a.publishedAt).valueOf() - new Date(b.publishedAt).valueOf()
    )
    .slice(-12);
  if (chartPosts.length === 0) {
    return {
      empty: true,
      polylinePoints: "",
      markers: [],
      domainStartLabel: "",
      domainEndLabel: "",
    };
  }
  const maxViews = Math.max(...chartPosts.map((post) => post.metrics.views), 1);
  const markers = chartPosts.map((post, index) => ({
    postId: post.id,
    x:
      chartPosts.length === 1
        ? SINGLE_POINT_X
        : (index / (chartPosts.length - 1)) * CHART_WIDTH,
    y: CHART_BASELINE - (post.metrics.views / maxViews) * CHART_HEIGHT,
  }));
  return {
    empty: false,
    polylinePoints: markers.map((marker) => `${marker.x},${marker.y}`).join(" "),
    markers,
    domainStartLabel: formatDate(chartPosts[0]?.publishedAt ?? null),
    domainEndLabel: formatDate(
      chartPosts[chartPosts.length - 1]?.publishedAt ?? null
    ),
  };
}

export function sourceHeading(input: {
  activeSource: string;
  csvAccountLabel: string | undefined;
  csvImportedAt: string | undefined;
  accountName: string | undefined;
  youtube: boolean;
  postCount: number;
}): PerformanceSourceHeading {
  if (input.activeSource === "csv") {
    return {
      title: input.csvAccountLabel ?? "Local CSV",
      subtitle: `Local CSV · imported ${input.csvImportedAt ? formatSyncDate(input.csvImportedAt) : ""}`,
    };
  }
  if (input.activeSource === "all-connected") {
    return {
      title: "All connected non-YouTube accounts",
      subtitle: providerSubtitle(false, input.postCount),
    };
  }
  return {
    title: input.accountName ?? "Connected account",
    subtitle: providerSubtitle(input.youtube, input.postCount),
  };
}

function providerSubtitle(youtube: boolean, postCount: number) {
  const noun = postCount === 1 ? "post" : "posts";
  if (youtube) {
    return `YouTube API data · ${postCount} ${noun} · no estimated metrics`;
  }
  return `Provider-owned data · ${postCount} ${noun} · no estimated metrics`;
}

function metricCell(
  label: string,
  aggregate: { value: number | null; available: number; total: number },
  noun: string,
  lifetime: boolean
): PerformanceStatCell {
  const availability = metricAvailability(aggregate, noun);
  return {
    label,
    value: formatMetric(aggregate.value),
    detail: lifetime ? `Lifetime counters · ${availability}` : availability,
    unavailable: aggregate.value === null,
  };
}

function engagementCell(
  aggregate: SourceAggregates["engagementRate"]
): PerformanceStatCell {
  if (!aggregate) {
    return {
      label: "Engagement rate",
      value: "—",
      detail: "No posts in range",
      unavailable: true,
    };
  }
  return {
    label: "Engagement rate",
    value:
      aggregate.value === null ? "—" : `${aggregate.value.toFixed(1)}%`,
    detail: metricAvailability(aggregate, "posts"),
    unavailable: aggregate.value === null,
  };
}
