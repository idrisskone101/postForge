import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const page = source("src/app/(app)/gallery/page.tsx");
const lazy = source("src/app/(app)/gallery/gallery-page-lazy.tsx");
const firstPaint = source("src/app/(app)/gallery/gallery-first-paint.tsx");
const client = source("src/app/(app)/gallery/gallery-page-client.tsx");
const grid = source("src/components/gallery-grid.tsx");
const cards = source("src/components/gallery/grid-cards.tsx");

assert.match(page, /GalleryFirstPaint/);
assert.match(page, /GalleryPageLazy/);
assert.match(page, /<Suspense fallback=\{null\}>/);
assert.match(lazy, /useWindowLoadReady/);
assert.match(lazy, /ssr:\s*false/);
assert.doesNotMatch(lazy, /workspace-header-accessory/);
assert.match(client, /data-gallery-first-body/);
assert.match(client, /useLayoutEffect/);

assert.match(firstPaint, /<PageHeader/);
assert.doesNotMatch(firstPaint, /"use client"/);
assert.doesNotMatch(firstPaint, /workspace-header-grid|pf-button|pf-card|data-lcp/);

for (const [name, text] of [
  ["gallery-page-client.tsx", client],
  ["gallery-grid.tsx", grid],
  ["gallery-first-paint.tsx", firstPaint],
] as const) {
  assert.doesNotMatch(text, /max-w-\[1280px\]|mx-auto|sm:p-6|lg:p-8/, `${name} adds its own page padding`);
}

assert.match(grid, /w-\[320px\]/);
assert.match(grid, /xl:flex/);
assert.match(grid, /<Sheet/);
assert.match(cards, /<MediaTile/);
assert.match(cards, /\[@media\(hover:none\)\]:\[&>\.wb-tile-check\]:after:-inset-2/);
assert.match(cards, /\[@media\(hover:none\)\]:\[&_\.wb-tile-action\]:h-10/);
