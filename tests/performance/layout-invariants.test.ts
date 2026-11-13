import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const performance = source("src/app/(app)/performance/performance-page-client.tsx");
assert.match(performance, /hidden overflow-x-auto sm:block/);
assert.match(source("src/app/(app)/performance/performance-empty-state.tsx"), /data-empty-heading="true"/);
assert.match(source("src/app/(app)/performance/performance-empty-state.tsx"), /data-empty-copy=/);
assert.doesNotMatch(source("src/app/(app)/performance/performance-empty-state.tsx"), /data-workspace-state="empty"/);
assert.doesNotMatch(
  source("src/app/(app)/performance/performance-empty-state.tsx"),
  /overflow-wrap:anywhere/,
);
assert.match(source("src/app/(app)/performance/page.tsx"), /PerformancePageLazy/);
