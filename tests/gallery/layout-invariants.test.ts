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

const inspectorEmpty = source("src/components/gallery/inspector-empty.tsx");
assert.match(inspectorEmpty, /GALLERY_INSPECTOR_CLASS = "[^"]*w-\[320px\][^"]*xl:flex/);
assert.match(grid, /<aside aria-label="Selected output" className=\{GALLERY_INSPECTOR_CLASS\}>/);
assert.doesNotMatch(grid, /\{selection && \(\s*<aside/, "the inspector column is always present from 1280");
assert.match(firstPaint, /GALLERY_INSPECTOR_CLASS/, "first paint holds the inspector column too");
assert.match(grid, /<Sheet/);
assert.match(cards, /<MediaTile/);
const tileCss = source("src/app/styles/workbench-data.css");
assert.match(
  tileCss,
  /@media \(hover: none\) \{[\s\S]*?\.wb-tile > \.wb-tile-actions \{\s*display: none;/,
  "touch tiles draw no action row"
);
assert.match(
  source("src/app/styles/workbench.css"),
  /@media \(pointer: coarse\) \{[\s\S]*?\.wb-tile-check[^{]*::after/,
  "the tile check gets its touch hit area from the shared coarse-pointer rule"
);
assert.doesNotMatch(cards, /hover:none/);
