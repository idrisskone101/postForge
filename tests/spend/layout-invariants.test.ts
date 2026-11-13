import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const dir = "src/app/(app)/costs";
const content = source(`${dir}/spend-page-content.tsx`);
const client = source(`${dir}/costs-page-client.tsx`);
const grid = source(`${dir}/spend-analysis-grid.tsx`);
const chart = source("src/components/cost-chart.tsx");
const transitional = source("src/app/styles/transitional.css");

assert.match(source(`${dir}/page.tsx`), /CostsPageClient/);
assert.doesNotMatch(content, /max-w-\[1280px\]|data-spend-|sr-only/, "the shell owns padding and copy is real text");
assert.doesNotMatch(transitional, /data-spend-/, "spend rules leave transitional.css");
assert.match(content, /spend-budget-dialog/);
assert.doesNotMatch(content, /TooltipProvider/);
assert.match(source(`${dir}/spend-range-control.tsx`), /<WorkspaceHeaderAccessory>/);
assert.match(source("src/lib/workspace-header-route.ts"), /pathname === "\/costs"/);
assert.match(client, /<SpendSkeleton \/>/);
assert.match(client, /<SpendLoadError/);
assert.match(grid, /import\("@\/components\/cost-chart"\)/);
assert.match(chart, /var\(--pf-chart-1\)/);
assert.match(chart, /var\(--pf-chart-2\)/);
assert.match(chart, /var\(--pf-ember\)/);
assert.match(chart, /isAnimationActive=\{false\}/);
assert.doesNotMatch(chart, /Gradient|PieChart/);
