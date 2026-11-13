import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

assert.match(source("src/components/slideshow/slideshow-studio-islands.tsx"), /ssr:\s*false/);
assert.match(
  source("src/components/slideshow/create-idea-form.tsx"),
  /data-slideshow-idea-submit=\{paintReady \? undefined : "true"\}/,
);
assert.match(
  source("src/components/slideshow/create-idea-form.tsx"),
  /data-slideshow-idea=\{paintReady \? undefined : "true"\}/,
);
assert.doesNotMatch(
  source("src/app/(app)/slideshow/slideshow-owned-header.tsx"),
  /SlideshowPaintText/,
);
assert.match(
  source("src/app/(app)/slideshow/slideshow-owned-header.tsx"),
  /data-home-title=\{TITLE\}/,
);
assert.match(
  source("src/app/(app)/slideshow/slideshow-owned-header.tsx"),
  /data-slideshow-copy=\{COPY\}/,
);
assert.match(
  source("src/app/(app)/slideshow/slideshow-owned-header.tsx"),
  /data-slideshow-studio=\{paintReady \? undefined : "true"\}/,
);
assert.match(source("src/app/(app)/slideshow/page.tsx"), /SlideshowStudioLazy/);
assert.match(source("src/app/(app)/slideshow/page.tsx"), /SlideshowOwnedHeader/);
assert.match(source("src/app/(app)/slideshow/page.tsx"), /SlideshowStudioFrame/);
assert.match(
  source("src/components/slideshow/slideshow-studio-lazy.tsx"),
  /useWindowLoadReady/,
);
