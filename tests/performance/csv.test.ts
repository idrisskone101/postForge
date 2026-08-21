import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parsePerformanceCsv } from "../../src/lib/performance/csv";
import {
  aggregateEngagementRate,
  aggregateMetric,
  aggregatePerformanceSource,
  canAggregateConnectedProviders,
  canDerivePerformanceMetrics,
  postEngagementRate,
  type PerformancePostView,
} from "../../src/lib/performance/metrics";

const parsed = parsePerformanceCsv(
  '\uFEFFtitle,views,likes,comments,shares,saves,publishedAt\r\n"Launch day, part one","12.5k",840,62,91,430,2026-08-01\r\n"A quote: ""ship it""",2m,10,2,3,4,2026-08-02'
);

assert.equal(parsed.length, 2);
assert.equal(parsed[0].title, "Launch day, part one");
assert.equal(parsed[0].views, 12_500);
assert.equal(parsed[1].title, 'A quote: "ship it"');
assert.equal(parsed[1].views, 2_000_000);

assert.throws(
  () => parsePerformanceCsv("title,views\nMissing date,10"),
  /publishedAt/
);
assert.throws(
  () => parsePerformanceCsv('title,views,publishedAt\n"Unclosed,10,2026-08-01'),
  /unclosed quoted field/
);

const sparseCsv = parsePerformanceCsv(
  "title,views,publishedAt\nOnly known values,20,2026-08-03"
);
assert.equal(sparseCsv[0].likes, null);
assert.equal(sparseCsv[0].comments, null);
assert.equal(sparseCsv[0].shares, null);
assert.equal(sparseCsv[0].saves, null);
assert.throws(
  () => parsePerformanceCsv("title,views,publishedAt\nMissing views,,2026-08-03"),
  /numeric views/
);
assert.throws(
  () => parsePerformanceCsv("title,views,publishedAt\nNegative views,-1,2026-08-03"),
  /non-negative numeric views/
);
assert.throws(
  () => parsePerformanceCsv("title,views,likes,publishedAt\nNegative likes,10,-2,2026-08-03"),
  /non-negative numeric likes/
);
assert.throws(
  () => parsePerformanceCsv("title,views,publishedAt\nBad date,10,not-a-date"),
  /valid publishedAt date/
);

const providerPosts: PerformancePostView[] = [
  {
    id: "reported",
    source: "provider",
    provider: "instagram",
    accountId: "ig-1",
    accountUsername: "creator",
    title: "Reported metrics",
    permalink: null,
    thumbnailUrl: null,
    mediaType: "video",
    publishedAt: "2026-08-03T12:00:00.000Z",
    metrics: {
      views: 100,
      likes: 10,
      comments: 3,
      shares: 2,
      saves: 7,
      reach: null,
      watchTimeMinutes: null,
    },
  },
  {
    id: "unavailable",
    source: "provider",
    provider: "instagram",
    accountId: "ig-2",
    accountUsername: null,
    title: "Unavailable metrics",
    permalink: null,
    thumbnailUrl: null,
    mediaType: "short",
    publishedAt: "2026-08-02T12:00:00.000Z",
    metrics: {
      views: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
      reach: null,
      watchTimeMinutes: null,
    },
  },
];

assert.deepEqual(aggregateMetric(providerPosts, "views"), {
  value: 100,
  available: 1,
  total: 2,
});
assert.deepEqual(aggregateMetric(providerPosts.slice(1), "views"), {
  value: null,
  available: 0,
  total: 1,
});
assert.deepEqual(aggregateEngagementRate(providerPosts), {
  value: 15,
  available: 1,
  total: 2,
});

const youtubePost: PerformancePostView = {
  ...providerPosts[0],
  id: "youtube-raw-only",
  provider: "youtube",
};
assert.equal(canDerivePerformanceMetrics("youtube"), false);
assert.equal(
  aggregatePerformanceSource([youtubePost], "youtube").engagementRate,
  null,
  "YouTube selection must not calculate a custom engagement ratio"
);
assert.equal(
  aggregatePerformanceSource([youtubePost], "youtube").views.value,
  100,
  "raw YouTube-only lifetime counters may be totaled"
);
assert.equal(
  postEngagementRate(youtubePost),
  null,
  "YouTube per-video values must not be converted into a derived ratio"
);
assert.notEqual(aggregatePerformanceSource(providerPosts, "instagram"), null);

assert.equal(
  canAggregateConnectedProviders([
    { provider: "tiktok" },
    { provider: "instagram" },
  ]),
  true
);
assert.equal(
  canAggregateConnectedProviders([
    { provider: "tiktok" },
    { provider: "youtube" },
  ]),
  false,
  "YouTube API data must never enter a cross-provider aggregate"
);
assert.equal(
  canAggregateConnectedProviders([
    { provider: "tiktok" },
    { provider: "instagram" },
    { provider: "youtube" },
  ]),
  true,
  "YouTube must not hide the valid TikTok plus Instagram aggregate"
);

const repoRoot = new URL("../../", import.meta.url);

function listFiles(relativeDir: string, files: string[] = []) {
  const dir = new URL(relativeDir, repoRoot);
  for (const entry of readdirSync(dir)) {
    const relative = `${relativeDir}${entry}`;
    const full = join(dir.pathname, entry);
    if (statSync(full).isDirectory()) {
      listFiles(`${relative}/`, files);
      continue;
    }
    if (entry.endsWith(".ts") || entry.endsWith(".tsx")) files.push(relative);
  }
  return files;
}

const performanceSource = [
  ...listFiles("src/app/performance/"),
  ...listFiles("src/lib/performance/"),
]
  .map((file) => readFileSync(new URL(file, repoRoot), "utf8"))
  .join("\n");
assert.match(performanceSource, /min-\[1180px\]:grid-cols-2/);
assert.match(performanceSource, /sm:hidden/);
assert.match(performanceSource, /hidden overflow-x-auto sm:block/);
assert.match(performanceSource, /Active performance source/);
assert.match(performanceSource, /All connected non-YouTube accounts/);
assert.match(performanceSource, /Clear CSV/);
assert.match(performanceSource, /IntegrationPerformanceResponse/);
assert.match(performanceSource, /post\.provider !== "youtube"/);
assert.match(performanceSource, /7\/30\/90 days selects videos published/);
assert.match(performanceSource, /youtubeRawOnly \? null : postEngagementRate/);
assert.match(performanceSource, /current lifetime counters, not activity during the selected period/);
assert.match(performanceSource, /Lifetime views by video publish date/);
