import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

assert.match(source("src/app/(app)/jobs/jobs-activity.tsx"), /data-jobs-board="true"/);
assert.match(source("src/app/(app)/jobs/page.tsx"), /JobsActivity/);
assert.match(source("src/app/(app)/jobs/jobs-activity.tsx"), /data-empty-cta="Create asset"/);
assert.match(source("src/app/(app)/jobs/jobs-activity.tsx"), /data-jobs-page="true"/);
assert.match(source("src/app/(app)/jobs/jobs-activity.tsx"), /paddingTop: 20/);
