import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const home = [
  "src/app/(app)/page.tsx",
  "src/app/(app)/home-cockpit.tsx",
  "src/app/(app)/home-glance-stats.tsx",
  "src/app/(app)/home-review-queue.tsx",
  "src/app/(app)/home-active-lane.tsx",
  "src/app/(app)/home-recent-media.tsx",
  "src/app/(app)/home-loading.tsx",
  "src/app/(app)/home-failed.tsx",
  "src/app/(app)/not-found.tsx",
]
  .map(source)
  .join("\n");

// The shell owns page padding, width and the header band
assert.doesNotMatch(home, /max-w-\[1280px\]|pf-content-viewport|pt-7|mx-auto/);
// Copy is real text, not data-* attributes drawn by CSS
assert.doesNotMatch(home, /data-home-|sr-only/);
// Old classes are gone in favour of the workbench primitives
assert.doesNotMatch(home, /pf-card|pf-button-primary|pf-section-title|pf-status-/);
// Review queue and In progress share a row from 1280; the In progress rail is 372px
assert.match(source("src/app/(app)/home-cockpit.tsx"), /min-\[1280px\]:flex-row/);
assert.match(source("src/app/(app)/home-cockpit.tsx"), /min-\[1280px\]:w-\[372px\]/);
// The first recent media image is fetched first
assert.match(source("src/app/(app)/home-recent-media.tsx"), /fetchPriority=\{priority \? "high"/);
// Home's rules left the transitional stylesheet (data-home-title stays for Clone and Slideshow headers)
assert.doesNotMatch(source("src/app/styles/transitional.css"), /data-home-(action|copy|glance-label)/);
