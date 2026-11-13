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
assert.match(inspectorEmpty, /GALLERY_INSPECTOR_CLASS = \[\s*"[^"]*w-\[320px\][^"]*xl:flex/);
assert.match(inspectorEmpty, /GALLERY_INSPECTOR_EMPTY_CLASS = \[\s*"[^"]*w-\[320px\][^"]*xl:flex/);
assert.match(
  grid,
  /<aside\s+aria-label="Selected output"\s+className=\{selection \? GALLERY_INSPECTOR_CLASS : GALLERY_INSPECTOR_EMPTY_CLASS\}/,
);
assert.doesNotMatch(grid, /\{selection && \(\s*<aside/, "the inspector column is always present from 1280");
assert.match(firstPaint, /GALLERY_INSPECTOR_EMPTY_CLASS/, "first paint holds the inspector column too");
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

// Tiles show resized variants, never the full-size originals. Only the first tile is
// fetched eagerly. Every tile, the first included, follows the shared loading motion.
assert.match(
  cards,
  /thumbnail=\{\{ sizes: GALLERY_TILE_THUMBNAIL_SIZES, priority: index === 0 \}\}/,
);
assert.match(cards, /className="wb-tile-cell wb-fade-in"/);
assert.match(source("src/components/media-preview.tsx"), /MEDIA_REVEAL_CLASS/);
assert.match(
  source("src/app/styles/workbench-data.css"),
  /\.wb-media-reveal\[data-loaded="true"\] \{\s+animation: wb-media-reveal var\(--pf-dur-state\) var\(--pf-ease\) both;/,
  "the reveal is a filling keyframe animation: a transition makes the image the largest contentful paint",
);
assert.match(
  source("src/app/styles/workbench-data.css"),
  /\.wb-media-reveal\[data-loaded="cached"\] \{\s+opacity: 1;/,
  "a file the browser already holds is shown at once when a filter or view change remounts it",
);
assert.match(source("src/components/gallery/list-table.tsx"), /thumbnail=\{\{ sizes: "40px" \}\}/);
assert.match(
  source("src/components/gallery/list-table.tsx"),
  /WIDE_COLUMN_CLASS = "hidden lg:max-xl:block min-\[1440px\]:block"/,
  "Size and Duration give their room to the title beside the inspector and below 1024",
);
assert.match(
  source("src/app/api/files/[id]/thumbnail/route.ts"),
  /"Cache-Control": "public, max-age=31536000, immutable"/,
);

// The first page crosses to the client as one JSON string. As a nested prop every long
// prompt streamed as its own separately compressed chunk (80 KB on the wire against 31 KB).
assert.match(page, /initialPageJson=\{JSON\.stringify\(page\)\}/);
assert.match(lazy, /JSON\.parse\(initialPageJson\)/);
