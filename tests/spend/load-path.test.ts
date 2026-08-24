import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const costsDir = path.join(repoRoot, "src/app/(app)/costs");
const pageSource = readFileSync(path.join(costsDir, "page.tsx"), "utf8");
const trackerSource = readFileSync(path.join(repoRoot, "src/lib/costs/tracker.ts"), "utf8");
const clientSource = readdirSync(costsDir)
  .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
  .filter((name) => !["page.tsx", "loading.tsx", "error.tsx"].includes(name))
  .sort()
  .map((name) => readFileSync(path.join(costsDir, name), "utf8"))
  .join("\n");
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

function namedPropCount(source: string, exportName: string): number {
  const match = source.match(
    new RegExp(`export function ${exportName}\\(\\{([^}]+)\\}`)
  );
  if (!match) {
    throw new Error(`missing destructured props for ${exportName}`);
  }
  return match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean).length;
}

for (const exportName of [
  "SpendPageContent",
  "SpendStatCards",
  "SpendAnalysisGrid",
  "SpendGenerationLog",
]) {
  const count = namedPropCount(clientSource, exportName);
  assert.ok(
    count < 8,
    `${exportName} takes ${count} props; pass a named view-model instead`
  );
}
assert.match(clientSource, /dashboard: CostsPageClientProps/);
assert.match(clientSource, /handlers: SpendPageHandlers/);

assert.match(exportRouteSource, /exportCostLogsCsv/);
assert.match(exportRouteSource, /text\/csv/);
assert.doesNotMatch(exportRouteSource, /demo/);
