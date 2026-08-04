import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { CharacterPhoto } from "../src/components/character-photo";
import { parseImportedCharacterAttributes } from "../src/app/characters/new/character-builder-client";
import {
  buildCharacterImagePrompt,
  characterRecipeFingerprint,
  CHARACTER_ATTRIBUTE_SECTIONS,
  DEFAULT_CHARACTER_ATTRIBUTES,
} from "../src/lib/character-attributes";

const builderSource = readFileSync(
  new URL("../src/app/characters/new/character-builder-client.tsx", import.meta.url),
  "utf8"
);
const librarySource = readFileSync(
  new URL("../src/app/characters/characters-page-client.tsx", import.meta.url),
  "utf8"
);
const avatarRouteSource = readFileSync(
  new URL("../src/app/api/avatars/[id]/route.ts", import.meta.url),
  "utf8"
);
const generationRouteSource = readFileSync(
  new URL("../src/app/api/generate/images/route.ts", import.meta.url),
  "utf8"
);

assert.match(builderSource, /data-character-workbench="true"/);
assert.match(builderSource, /data-character-workbench-header="true"/);
assert.match(builderSource, /data-character-category-rail="true"/);
assert.match(builderSource, /data-character-recipe-step-rail="true"/);
assert.match(builderSource, /data-character-preview-stage="true"/);
assert.match(builderSource, /data-character-attribute-editor="true"/);
assert.match(
  builderSource,
  /min-\[1280px\]:grid-cols-\[200px_minmax\(420px,1\.2fr\)_minmax\(360px,0\.8fr\)\]/
);
assert.match(builderSource, /min-\[1280px\]:h-dvh/);
assert.ok(
  builderSource.indexOf('data-character-category-rail="true"') <
    builderSource.indexOf('data-character-preview-stage="true"')
);
assert.ok(
  builderSource.indexOf('data-character-preview-stage="true"') <
    builderSource.indexOf('data-character-attribute-editor="true"')
);
assert.match(builderSource, /aria-label="Character name"/);
assert.match(builderSource, /Save character/);
assert.match(builderSource, /Import prompt or JSON/);
assert.match(builderSource, /Copy attributes JSON/);
assert.match(builderSource, /Copy prompt/);
assert.match(builderSource, /Randomize identity/);
assert.match(builderSource, /Re-render preview/);
assert.match(builderSource, /saveCharacterAvatar/);
assert.match(builderSource, /\/api\/avatars/);
assert.match(builderSource, /\/api\/generate\/images/);
assert.match(builderSource, /\/api\/jobs\//);
assert.match(builderSource, /characterPreview: true/);
assert.match(builderSource, /previewDirty/);
assert.match(builderSource, /previewKind: "photographic"/);
assert.match(builderSource, /Re-render preview so the saved photo matches/);
assert.match(builderSource, /avatarProfile/);
assert.match(builderSource, /missingEditRecord/);
assert.match(builderSource, /group\.key === "lipFullness"/);
assert.match(builderSource, /type="range"/);
assert.match(builderSource, /Photographic recipe preview/);
assert.doesNotMatch(builderSource, /CharacterPortrait|procedural/i);
assert.match(librarySource, /photoReady/);
assert.match(librarySource, /record\.previewKind === "photographic"/);
assert.match(librarySource, />DRAFT</);
assert.match(librarySource, /method: "DELETE"/);
assert.match(librarySource, /linkedAvatarRemoved/);
assert.match(generationRouteSource, /jobTags: body\.characterPreview/);
assert.match(generationRouteSource, /"character-preview"/);
assert.match(avatarRouteSource, /avatarIdentityPack\.deleteMany/);
assert.match(avatarRouteSource, /ugcReferenceImage\.deleteMany/);

const photoMarkup = renderToStaticMarkup(
  <CharacterPhoto alt="Character preview" />
);

assert.match(photoMarkup, /data-character-preview="photographic"/);
assert.match(photoMarkup, /alt="Character preview"/);
assert.match(photoMarkup, /<img/);
assert.match(photoMarkup, /\/character-builder\/default-portrait\.png/);
assert.doesNotMatch(photoMarkup, /https?:\/\//);

const defaultPortrait = readFileSync(
  new URL("../public/character-builder/default-portrait.png", import.meta.url)
);
assert.equal(defaultPortrait.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
assert.ok(defaultPortrait.length > 100_000, "default portrait should be a real image asset");

assert.deepEqual(
  parseImportedCharacterAttributes(
    JSON.stringify({ gender: "female", noseHeight: "balanced", lipFullness: "88%" })
  ),
  { gender: "Female", noseHeight: "Balanced", lipFullness: "88" }
);
assert.throws(
  () => parseImportedCharacterAttributes('{"gender":"not-a-supported-identity"}'),
  /No supported character attributes/
);

const baselineFingerprint = characterRecipeFingerprint(DEFAULT_CHARACTER_ATTRIBUTES);
const baselinePrompt = buildCharacterImagePrompt(DEFAULT_CHARACTER_ATTRIBUTES);
assert.match(baselinePrompt, /photorealistic 3:4 studio character portrait/i);
assert.match(baselinePrompt, /No text, captions, interface chrome, logos, watermark/i);

for (const group of CHARACTER_ATTRIBUTE_SECTIONS.flatMap(
  (section) => section.groups
)) {
  const alternate = group.options.find(
    (option) => option !== DEFAULT_CHARACTER_ATTRIBUTES[group.key]
  );
  assert.ok(alternate, `${group.label} needs at least two choices`);
  const changedAttributes = {
    ...DEFAULT_CHARACTER_ATTRIBUTES,
    [group.key]: alternate,
  };
  assert.notEqual(
    characterRecipeFingerprint(changedAttributes),
    baselineFingerprint,
    `${group.label} must change the saved photographic recipe fingerprint`
  );
  assert.notEqual(
    buildCharacterImagePrompt(changedAttributes),
    baselinePrompt,
    `${group.label} must change the provider image prompt`
  );
}

console.log("Character builder workbench checks passed");
