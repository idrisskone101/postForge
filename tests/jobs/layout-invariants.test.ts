import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const page = source("src/app/(app)/jobs/page.tsx");
const activity = source("src/app/(app)/jobs/jobs-activity.tsx");
const table = source("src/app/(app)/jobs/jobs-table.tsx");

assert.match(page, /JobsActivity/);
assert.match(page, /fallback=\{<JobsSkeleton \/>\}/, "loading renders a skeleton, not zero counts");
assert.doesNotMatch(activity, /pf-content-viewport|max-w-\[1280px\]|data-jobs-/);
assert.doesNotMatch(activity, /sr-only/);
assert.match(table, /w-\[130px\]/);
assert.match(table, /w-\[120px\]/);
assert.doesNotMatch(
  source("src/app/styles/transitional.css"),
  /data-jobs-/,
  "the jobs route draws its own copy"
);
