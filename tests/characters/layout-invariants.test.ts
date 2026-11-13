import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const characters = source("src/app/(app)/characters/characters-page-client.tsx");
const characterBuilder = source(
  "src/app/(app)/characters/new/character-builder-client.tsx"
);
assert.match(characterBuilder, /min-\[1280px\]:grid-cols-\[200px_minmax\(420px,1\.2fr\)_minmax\(360px,0\.8fr\)\]/);

// Short viewports must be able to scroll every large custom dialog.
assert.match(characters, /pf-safe-overlay[^"\n]*[\s\S]*?max-h-full[^"\n]*overflow-y-auto/);
assert.match(characterBuilder, /pf-safe-overlay[^"\n]*[\s\S]*?max-h-full[^"\n]*overflow-y-auto/);
assert.match(source("src/app/(app)/characters/new/character-preview-stage.tsx"), /priority/);
assert.doesNotMatch(source("src/app/(app)/characters/new/page.tsx"), /Suspense/);
assert.match(source("src/app/(app)/characters/new/page.tsx"), /CharacterBuilderStatic/);
assert.match(source("src/app/(app)/characters/new/page.tsx"), /CharacterBuilderClientLazy/);
assert.doesNotMatch(
  source("src/app/(app)/characters/new/page.tsx"),
  /from "\.\/character-builder-client"/,
);
assert.match(
  source("src/app/(app)/characters/new/character-builder-client-lazy.tsx"),
  /ssr:\s*false/,
);
assert.doesNotMatch(
  source("src/app/(app)/characters/new/character-builder-static.tsx"),
  /"use client"/,
);
assert.match(source("src/app/(app)/characters/new/character-builder-client.tsx"), /CharacterAttributeEditor/);
assert.doesNotMatch(source("src/app/(app)/characters/new/character-builder-client.tsx"), /CharacterAttributeEditorLazy/);
assert.match(
  source("src/app/(app)/characters/new/character-attribute-editor.tsx"),
  /data-character-section=\{section\.label\}/,
);
assert.match(source("src/app/(app)/characters/characters-empty.tsx"), /data-empty-copy=/);
assert.doesNotMatch(
  source("src/app/(app)/characters/characters-empty.tsx"),
  /liveClassName=.*max-w-md/,
);
assert.match(source("src/app/(app)/characters/page.tsx"), /CharactersPageLazy/);
assert.match(source("src/app/(app)/characters/new/character-preview-stage.tsx"), /data-character-cost=/);
assert.match(source("src/app/(app)/characters/new/character-builder-header.tsx"), /data-character-title=/);
