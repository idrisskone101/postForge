import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const page = source("src/app/(app)/ugc-inspiration/page.tsx");
const client = source("src/app/(app)/ugc-inspiration/inspiration-page-client.tsx");
const lazy = source("src/app/(app)/ugc-inspiration/inspiration-page-lazy.tsx");
const routeSources = [
  page,
  client,
  lazy,
  source("src/app/(app)/ugc-inspiration/inspiration-creator-rail.tsx"),
  source("src/app/(app)/ugc-inspiration/inspiration-source-library.tsx"),
  source("src/app/(app)/ugc-inspiration/inspiration-video-card.tsx"),
  source("src/app/(app)/ugc-inspiration/inspiration-preview-dialog.tsx"),
  source("src/app/(app)/ugc-inspiration/inspiration-header-controls.tsx"),
].join("\n");

assert.doesNotMatch(routeSources, /100vh/);
assert.doesNotMatch(routeSources, /max-w-\[1280px\]/, "the shell owns the page width");
assert.doesNotMatch(routeSources, /\bpx-4 py-5\b|lg:py-7/, "the shell owns the page padding");
assert.doesNotMatch(routeSources, /pf-card|pf-button-|pf-section-title|pf-data/, "legacy classes are replaced");
assert.doesNotMatch(routeSources, /animate-spin|Loader2/, "no spinner loops");
assert.doesNotMatch(routeSources, /[–—]/, "no long dashes in copy");
assert.doesNotMatch(routeSources, /window\.confirm\(|window\.location\.assign/, "the route view keeps no imperative navigation");

assert.match(client, /next\/dynamic/);
assert.match(client, /WorkspaceHeaderAccessory/);
assert.match(client, /wb-toast-region/);
assert.match(page, /InspirationPageLazy/);
assert.match(lazy, /useWindowLoadReady/);
