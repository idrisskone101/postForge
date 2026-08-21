import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pageSource = readFileSync(path.join(repoRoot, "src/app/costs/page.tsx"), "utf8");
const trackerSource = readFileSync(path.join(repoRoot, "src/lib/costs/tracker.ts"), "utf8");
const clientSource = readFileSync(
  path.join(repoRoot, "src/app/costs/costs-page-client.tsx"),
  "utf8"
);
const exportRouteSource = readFileSync(
  path.join(repoRoot, "src/app/api/costs/export/route.ts"),
  "utf8"
);

assert.match(pageSource, /getDailyCostSeries/);
assert.match(pageSource, /getCostSummaryForRange/);
assert.match(pageSource, /getCostTotalForRange/);
assert.match(pageSource, /listCostLogsPage/);
assert.match(pageSource, /parseCostLogSearch/);
assert.match(pageSource, /parseCostLogModel/);
assert.doesNotMatch(pageSource, /prisma\.costLog\.findMany/);
assert.doesNotMatch(pageSource, /exportCostLogsCsv/);
assert.doesNotMatch(pageSource, /costLogs\.reduce/);
assert.doesNotMatch(pageSource, /prevCostLogs/);

assert.match(trackerSource, /groupBy/);
assert.match(trackerSource, /to_char\("createdAt", 'YYYY-MM-DD'\)/);
assert.match(trackerSource, /take: COST_LOG_PAGE_SIZE/);
assert.match(trackerSource, /exportCostLogsCsv/);
assert.match(trackerSource, /contains: filter.search/);

assert.match(clientSource, /logTotalCount/);
assert.match(clientSource, /logHasNext/);
assert.match(clientSource, /onLogPageChange/);
assert.match(clientSource, /\/api\/costs\/export/);
assert.doesNotMatch(clientSource, /filteredLogs/);
assert.doesNotMatch(clientSource, /logs\.filter/);
assert.doesNotMatch(clientSource, /filteredLogs\.slice/);

assert.match(exportRouteSource, /exportCostLogsCsv/);
assert.match(exportRouteSource, /text\/csv/);
assert.doesNotMatch(exportRouteSource, /demo/);
