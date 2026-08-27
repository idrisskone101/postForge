import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const CAP = 400;
const repoRoot = new URL("../../", import.meta.url);

function lineCount(relativePath: string) {
  const text = readFileSync(new URL(relativePath, repoRoot), "utf8");
  if (text.length === 0) return 0;
  return text.endsWith("\n")
    ? text.slice(0, -1).split("\n").length
    : text.split("\n").length;
}

function collectJobsRouteFiles(): string[] {
  const jobsDir = new URL("src/app/(app)/jobs/", repoRoot);
  const files: string[] = [];
  const visit = (dirUrl: URL, prefix: string) => {
    for (const entry of readdirSync(dirUrl, { withFileTypes: true })) {
      const rel = `${prefix}${entry.name}`;
      if (entry.isDirectory()) {
        visit(new URL(`${rel}/`, repoRoot), `${rel}/`);
        continue;
      }
      if (entry.isFile() && (rel.endsWith(".ts") || rel.endsWith(".tsx"))) {
        files.push(rel);
      }
    }
  };
  visit(jobsDir, "src/app/(app)/jobs/");
  return files.sort();
}

const files = collectJobsRouteFiles();

for (const file of files) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

assert.ok(
  lineCount("src/app/(app)/jobs/jobs-activity.tsx") < 371,
  "jobs-activity.tsx must shrink below 371 lines"
);

const jobsTsxFiles = files.filter((file) => file.endsWith(".tsx"));
for (const file of jobsTsxFiles) {
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  assert.doesNotMatch(source, /export type /, `${file} must not export types`);
  assert.doesNotMatch(source, /pf-masthead/, `${file} must not use pf-masthead`);
  assert.doesNotMatch(source, /#(?:[0-9A-Fa-f]{3,8})\b/, `${file} must not use literal hex`);
}

const activity = readFileSync(
  new URL("src/app/(app)/jobs/jobs-activity.tsx", repoRoot),
  "utf8"
);
assert.match(activity, /data-jobs-filters="true"/);
assert.doesNotMatch(activity, /data-bulk/i);
assert.doesNotMatch(activity, /bulk-bar/i);
assert.doesNotMatch(activity, /type="checkbox"/i);

const jobsPage = readFileSync(new URL("src/app/(app)/jobs/page.tsx", repoRoot), "utf8");
assert.match(jobsPage, /JOBS_HAIRLINE_CSS/);

const jobsPanel = readFileSync(new URL("src/app/(app)/jobs/jobs-panel.tsx", repoRoot), "utf8");
assert.match(
  jobsPanel,
  /\[data-jobs-summary="true"\] a\{border:1px solid var\(--pf-border\)/
);

const firstPaint = readFileSync(new URL("src/app/first-paint-css.ts", repoRoot), "utf8");
assert.doesNotMatch(firstPaint, /\[data-jobs-summary="true"\] a\{border/);

assert.equal(
  existsSync(new URL("src/app/(app)/jobs/types.ts", repoRoot)),
  true,
  "jobs/types.ts must exist"
);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
