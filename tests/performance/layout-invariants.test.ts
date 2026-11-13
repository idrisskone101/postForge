import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const dir = "src/app/(app)/performance";
const page = source(`${dir}/performance-page-client.tsx`);
const empty = source(`${dir}/performance-empty-state.tsx`);
const posts = source(`${dir}/performance-posts.tsx`);
const chart = source(`${dir}/performance-chart.tsx`);
const pill = source(`${dir}/performance-range-pill.tsx`);
const headerRoute = source("src/lib/workspace-header-route.ts");

assert.match(source(`${dir}/page.tsx`), /PerformancePageLazy/);
assert.match(source(`${dir}/performance-page-lazy.tsx`), /loading: PerformanceSkeleton/);

assert.doesNotMatch(page, /max-w-\[1280px\]|data-page-inset|px-5 py-5/, "the shell owns page padding");
for (const file of [page, empty, posts, chart, pill]) {
  assert.doesNotMatch(file, /data-empty-|sr-only|—|–/, "real text, no copy attributes, no long dashes");
}

assert.match(pill, /<WorkspaceHeaderAccessory>/);
assert.match(headerRoute, /pathname === "\/performance"/);

assert.match(chart, /var\(--pf-chart-1\)/);
assert.match(chart, /var\(--pf-chart-grid\)/);
assert.match(chart, /bg-ember/);
assert.doesNotMatch(chart, /Gradient|drop-shadow|filter=/);

assert.match(posts, /wb-table-head/);
assert.match(empty, /href="\/settings\?tab=integrations"/);
