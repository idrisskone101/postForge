import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const CAP = 400;
const repoRoot = new URL("../../", import.meta.url);

function lineCount(relativePath: string) {
  const text = readFileSync(new URL(relativePath, repoRoot), "utf8");
  if (text.length === 0) return 0;
  return text.endsWith("\n")
    ? text.slice(0, -1).split("\n").length
    : text.split("\n").length;
}

const files = [
  "src/app/(app)/home-cockpit.tsx",
  "src/app/(app)/home-header.tsx",
  "src/app/(app)/home-glance-stats.tsx",
  "src/app/(app)/home-start-work.tsx",
  "src/app/(app)/home-review-queue.tsx",
  "src/app/(app)/home-active-lane.tsx",
  "src/app/(app)/home-panel.tsx",
  "src/app/(app)/home-types.ts",
  "src/app/(app)/home-loading.tsx",
];

for (const file of files) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

assert.ok(
  lineCount("src/app/(app)/home-cockpit.tsx") < 496,
  "home-cockpit.tsx must shrink"
);
assert.equal(existsSync(new URL("src/app/home/index.ts", repoRoot)), false);
assert.equal(existsSync(new URL("src/app/index.ts", repoRoot)), false);

const reviewQueue = readFileSync(new URL("src/app/(app)/home-review-queue.tsx", repoRoot), "utf8");
assert.doesNotMatch(reviewQueue, /useRouter/);
assert.doesNotMatch(reviewQueue, /rules-of-hooks/);
assert.match(reviewQueue, /onReviewSaved\?/);

const homePage = readFileSync(new URL("src/app/(app)/page.tsx", repoRoot), "utf8");
assert.match(homePage, /<HomeCockpit/);
assert.doesNotMatch(homePage, /HomeCockpitClient/);
assert.match(homePage, /export default async function HomePage/);
assert.match(homePage, /Suspense/);
assert.match(homePage, /<HomeHeader/);

const homeHeader = readFileSync(new URL("src/app/(app)/home-header.tsx", repoRoot), "utf8");
assert.match(homeHeader, /<Link[\s\S]*href="\/ugc-clone"[\s\S]*prefetch=\{false\}/);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
