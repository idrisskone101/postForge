import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const repoRoot = new URL("../../", import.meta.url);

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, repoRoot), "utf8");
}

const reviewStatusControl = source("src/components/gallery/review-status-control.tsx");
const lightbox = source("src/components/gallery/lightbox.tsx");
const galleryGrid = source("src/components/gallery-grid.tsx");
const galleryWorkspace = source("src/app/gallery/use-gallery-workspace.ts");

assert.doesNotMatch(reviewStatusControl, /useEffect/);
assert.doesNotMatch(reviewStatusControl, /setCurrent/);
assert.match(reviewStatusControl, /reviewStatus\.value/);

assert.doesNotMatch(lightbox, /useEffect\(\(\)\s*=>\s*setCurrent/);
assert.match(lightbox, /reviewStatus\.value === "approved_output"/);

assert.doesNotMatch(galleryGrid, /useEffect/);
assert.match(galleryGrid, /preferredInspectedId/);
assert.match(galleryGrid, /const inspectedId =/);

assert.doesNotMatch(galleryWorkspace, /didMountRef/);
assert.match(galleryWorkspace, /setReviewFilterAndReload/);
assert.match(galleryWorkspace, /useGalleryFilterReload/);

const galleryFilterReload = source("src/app/gallery/gallery-filter-reload.ts");
assert.match(galleryFilterReload, /reloadGallery/);
assert.match(galleryFilterReload, /setTypeFilterAndReload/);
assert.match(galleryFilterReload, /setSortOrderAndReload/);
assert.match(
  galleryWorkspace,
  /window\.setTimeout\(\(\) => setFeedback\(null\), 4200\)/
);
