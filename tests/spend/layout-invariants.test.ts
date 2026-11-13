import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const spendLoading = source("src/app/(app)/costs/spend-page-content.tsx");
assert.match(spendLoading, /lg:w-72/);
assert.match(spendLoading, /flex flex-wrap items-center gap-2/);
assert.match(source("src/app/(app)/costs/spend-analysis-grid.tsx"), /data-spend-chart-slot="true"/);
assert.match(source("src/app/(app)/costs/spend-page-content.tsx"), /data-spend-actions="true"/);
assert.match(source("src/app/(app)/costs/spend-analysis-grid.tsx"), /data-spend-empty="true"/);
assert.doesNotMatch(source("src/app/(app)/costs/spend-analysis-grid.tsx"), /data-workspace-state="empty"/);
assert.doesNotMatch(
  source("src/app/(app)/costs/spend-stat-cards.tsx"),
  /SpendPaintText/,
);
assert.match(
  source("src/app/(app)/costs/spend-stat-cards.tsx"),
  /data-spend-stats="true"/,
);
assert.match(spendLoading, /data-spend-intro="true"/);
assert.match(spendLoading, /spend-budget-dialog/);
assert.doesNotMatch(spendLoading, /TooltipProvider/);
assert.match(source("src/app/(app)/costs/page.tsx"), /CostsPageClient/);
