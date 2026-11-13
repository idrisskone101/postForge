import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const page = source("src/app/(app)/slideshow/page.tsx");
assert.match(page, /SlideshowStudioLazy/);
assert.doesNotMatch(page, /max-w-|pf-content-viewport|px-\d|border-b/, "the route root adds no page chrome of its own");

const lazy = source("src/components/slideshow/slideshow-studio-lazy.tsx");
assert.match(lazy, /useWindowLoadReady/);
assert.match(lazy, /ssr:\s*false/);
assert.match(lazy, /<PageHeader title="Slideshow" stackBelow=\{480\} \/>/, "first paint shows the real page header with its small-screen rows");

const studio = source("src/components/slideshow/slideshow-studio.tsx");
assert.doesNotMatch(studio, /fixed inset-0/, "the editor renders inside the shell, not as an overlay");

const home = source("src/components/slideshow/studio-home.tsx");
assert.match(home, /<PageHeader title="Slideshow" stackBelow=\{480\}>/);
assert.match(home, /role="tablist"/);

assert.match(source("src/components/slideshow/slideshow-studio-islands.tsx"), /ssr:\s*false/);
assert.equal(
  existsSync(new URL("../../src/app/(app)/slideshow/slideshow-owned-header.tsx", import.meta.url)),
  false,
);
assert.doesNotMatch(source("src/app/styles/transitional.css"), /data-slideshow-copy/);
