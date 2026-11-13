import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const page = source("src/app/(app)/characters/page.tsx");
assert.doesNotMatch(page, /"use client"/, "the library page renders on the server");
assert.match(page, /readWorkspaceFeatureRecords<CharacterRecord>\("characters"\)/);
assert.match(page, /<CharactersPageClient initial=\{initial\} \/>/);
assert.doesNotMatch(page, /ssr:\s*false|dynamic\(/);

const client = source("src/app/(app)/characters/characters-page-client.tsx");
assert.match(client, /xl:h-\[calc\(100dvh-100px\)\]/);
assert.match(client, /wb-panel hidden w-\[360px\] shrink-0/, "inspector is the 360px rail from 1280");
assert.match(client, /<SheetContent[\s\S]*side="bottom"[\s\S]*xl:hidden/, "the inspector becomes a bottom sheet below 1280");
assert.match(client, /CharacterDeleteDialog/);
assert.match(client, /wb-toast-region/);

const library = source("src/app/(app)/characters/characters-library.tsx");
assert.match(library, /label="Filter by identity"/);
assert.match(library, /label="Library view"/);
assert.match(library, /grid-cols-2 gap-x-3\.5 gap-y-\[18px\] sm:grid-cols-3 lg:grid-cols-4/);
assert.match(library, /priority=\{index === 0\}/, "only the first tile is fetched with high priority");

const card = source("src/app/(app)/characters/characters-card.tsx");
assert.match(card, /wb-tile aspect-\[343\/600\]/);
assert.match(card, /sizes=\{TILE_SIZES\}/);

const photo = source("src/components/character-photo.tsx");
assert.match(photo, /characterPortraitSrcSet\(avatarId\)/);
assert.doesNotMatch(photo, /#[0-9A-Fa-f]{3,8}\b/);

const builderPage = source("src/app/(app)/characters/new/page.tsx");
assert.doesNotMatch(builderPage, /"use client"|Lazy|Static/);
assert.match(builderPage, /<CharacterBuilderClient key=\{editId \?\? "new"\} editId=\{editId\} \/>/);

const header = source("src/app/(app)/characters/new/character-builder-header.tsx");
assert.match(header, /<PageHeader/);
assert.match(header, /back=\{\{ href: "\/characters", label: "Characters", labelled: true \}\}/);
assert.match(header, /variant="strong"[\s\S]*Randomize & render/);
assert.match(header, /variant="primary"/);

const builder = source("src/app/(app)/characters/new/character-builder-client.tsx");
assert.match(builder, /xl:flex-row/);
assert.match(source("src/app/(app)/characters/new/character-category-rail.tsx"), /xl:w-\[272px\]/);
assert.match(source("src/app/(app)/characters/new/character-preview-stage.tsx"), /lg:w-\[344px\]/);

const routeFiles: string[] = [];
const walk = (relative: string) => {
  for (const entry of readdirSync(new URL(`../../${relative}`, import.meta.url), { withFileTypes: true })) {
    const next = `${relative}${entry.name}`;
    if (entry.isDirectory()) walk(`${next}/`);
    else if (/\.tsx?$/.test(entry.name)) routeFiles.push(next);
  }
};
walk("src/app/(app)/characters/");
for (const file of routeFiles) {
  const text = source(file);
  assert.doesNotMatch(text, /data-character-(action|blueprint|cost|preview-label|rail-copy|rail-kicker|rail-pct|section|status|title)=/, `${file} renders real text`);
  assert.doesNotMatch(text, /className="sr-only"/, `${file} has no sr-only copy twins`);
  assert.doesNotMatch(text, /[–—]/, `${file} has no long dashes`);
  assert.doesNotMatch(text, /max-w-\[1280px\]|data-page-inset/, `${file} adds no page container`);
}

assert.doesNotMatch(source("src/app/styles/transitional.css"), /data-character-/);

console.log("Characters layout invariants passed");
