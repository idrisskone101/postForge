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
  "src/app/(app)/page.tsx",
  "src/app/(app)/home-cockpit.tsx",
  "src/app/(app)/home-glance-stats.tsx",
  "src/app/(app)/home-review-queue.tsx",
  "src/app/(app)/home-active-lane.tsx",
  "src/app/(app)/home-recent-media.tsx",
  "src/app/(app)/home-loading.tsx",
  "src/app/(app)/home-failed.tsx",
  "src/app/(app)/home-format.ts",
  "src/app/(app)/home-types.ts",
];

for (const file of files) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

assert.equal(existsSync(new URL("src/app/(app)/home-start-work.tsx", repoRoot)), false);
assert.equal(existsSync(new URL("src/app/(app)/home-panel.tsx", repoRoot)), false);
assert.equal(existsSync(new URL("src/app/home/index.ts", repoRoot)), false);

const reviewQueue = readFileSync(new URL("src/app/(app)/home-review-queue.tsx", repoRoot), "utf8");
assert.doesNotMatch(reviewQueue, /useRouter/);
assert.match(reviewQueue, /onReviewSaved\?/);
assert.match(reviewQueue, /\/api\/files\/\$\{encodeURIComponent\(outputId\)\}\/review-status/);
assert.match(reviewQueue, /method: "PATCH"/);
assert.match(reviewQueue, /key=\{item\.outputId\}/);

const homePage = readFileSync(new URL("src/app/(app)/page.tsx", repoRoot), "utf8");
assert.match(homePage, /<HomeCockpit/);
assert.match(homePage, /export default async function HomePage/);
assert.match(homePage, /<Suspense fallback=\{<HomeLoading \/>\}>/);
assert.match(homePage, /<PageHeader title="Home" \/>/);
assert.match(homePage, /<HomeLoadFailed \/>/);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
