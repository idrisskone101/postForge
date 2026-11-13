import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const gallery = source("src/app/(app)/gallery/gallery-page-client.tsx");
const galleryLoading = source("src/app/(app)/gallery/gallery-page-client.tsx");
const galleryGrid = source("src/components/gallery-grid.tsx");
assert.match(gallery, /flex-col[^"\n]*sm:flex-row/);
assert.match(galleryLoading, /data-gallery-tool-row="true"/);
assert.match(galleryLoading, /flex-nowrap/);
assert.match(galleryGrid, /item\.prompt[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?item\.prompt/);
assert.match(galleryGrid, /lightbox\.prompt[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?lightbox\.prompt/);
assert.match(source("src/app/(app)/gallery/gallery-page-client.tsx"), /data-gallery-page="true"/);
assert.match(source("src/app/(app)/gallery/gallery-page-client.tsx"), /data-gallery-count="true"/);
assert.match(source("src/app/(app)/gallery/gallery-page-client.tsx"), /data-gallery-search="true"/);
assert.match(source("src/app/(app)/gallery/gallery-page-client.tsx"), /data-gallery-tool-row="true"/);
assert.match(source("src/app/(app)/gallery/page.tsx"), /GalleryPageLazy/);
assert.match(source("src/app/(app)/gallery/page.tsx"), /GalleryFirstPaint/);
assert.match(
  source("src/app/(app)/gallery/page.tsx"),
  /<Suspense fallback=\{null\}>/,
);
assert.match(source("src/app/(app)/gallery/gallery-page-lazy.tsx"), /ssr:\s*false/);
assert.match(
  source("src/app/(app)/gallery/gallery-page-lazy.tsx"),
  /data-gallery-first-body/,
);
assert.match(
  source("src/app/(app)/gallery/gallery-page-lazy.tsx"),
  /workspace-header-accessory/,
);
assert.match(
  source("src/app/(app)/gallery/gallery-page-lazy.tsx"),
  /replaceChildren/,
);
assert.match(
  source("src/app/(app)/gallery/gallery-page-lazy.tsx"),
  /useWindowLoadReady/,
);
