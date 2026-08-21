import type {
  ConnectedIntegrationAccountStatus,
  IntegrationPerformanceResponse,
  IntegrationProvider,
  OwnedPostMetrics,
  PublicIntegrationStatus,
} from "@/lib/integrations/types";
import type { CsvPostMetric } from "@/lib/performance/csv";

export type PerformancePostView = {
  id: string;
  source: "provider" | "csv";
  provider: IntegrationProvider | null;
  accountId: string | null;
  accountUsername: string | null;
  title: string;
  permalink: string | null;
  thumbnailUrl: string | null;
  mediaType: "video" | "image" | "carousel" | "short" | "unknown" | "report";
  publishedAt: string | null;
  metrics: OwnedPostMetrics;
};

export type MetricAggregate = {
  value: number | null;
  available: number;
  total: number;
};

export type ConnectedAccountView = {
  provider: IntegrationProvider;
  status: PublicIntegrationStatus;
  account: ConnectedIntegrationAccountStatus;
  sourceKey: string;
};

export function aggregateMetric(
  posts: PerformancePostView[],
  key: keyof Pick<
    OwnedPostMetrics,
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

export function csvPostToView(post: CsvPostMetric): PerformancePostView {
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

export function providerPostToView(
  post: IntegrationPerformanceResponse["posts"][number]
): PerformancePostView {
  return {
    ...post,
    source: "provider",
    title: post.title || `${providerDisplayName(post.provider)} ${post.mediaType}`,
  };
}

export function providerDisplayName(provider: IntegrationProvider) {
  return provider === "youtube"
    ? "YouTube"
    : provider[0].toUpperCase() + provider.slice(1);
}

export function connectedAccountName(account: ConnectedIntegrationAccountStatus) {
  return (
    account.account.displayName ||
    (account.account.username
      ? accountHandle(account.account.username)
      : "Connected account")
  );
}

export function accountHandle(username: string | null) {
  return username
    ? username.startsWith("@")
      ? username
      : `@${username}`
    : "Username unavailable";
}

export function canAggregateConnectedProviders(
  providers: Array<{ provider: IntegrationProvider }>
) {
  return providers.filter((status) => status.provider !== "youtube").length >= 2;
}

export function canDerivePerformanceMetrics(
  provider: IntegrationProvider | null | undefined
) {
  return provider !== "youtube";
}

export function aggregatePerformanceSource(
  posts: PerformancePostView[],
  provider: IntegrationProvider | null | undefined
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

export function postEngagementRate(post: PerformancePostView) {
  if (post.provider === "youtube") return null;
  const { views, likes, comments, shares } = post.metrics;
  if ([views, likes, comments, shares].some((value) => value === null) || !views) return null;
  return (((likes as number) + (comments as number) + (shares as number)) / views) * 100;
}
