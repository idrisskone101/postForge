import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { CharacterPhoto } from "../../src/components/character-photo";
import { parseImportedCharacterAttributes } from "../../src/app/(app)/characters/new/character-import";
import {
  buildCharacterImagePrompt,
  characterRecipeFingerprint,
  CHARACTER_ATTRIBUTE_SECTIONS,
  DEFAULT_CHARACTER_ATTRIBUTES,
} from "../../src/lib/character-attributes";

const workbenchDir = new URL("../../src/app/(app)/characters/new/", import.meta.url);
const headerSource = readFileSync(
  new URL("character-builder-header.tsx", workbenchDir),
  "utf8"
);
const previewSource = readFileSync(
  new URL("character-preview-stage.tsx", workbenchDir),
  "utf8"
);
const editorSource = readFileSync(
  new URL("character-attribute-editor.tsx", workbenchDir),
  "utf8"
);
const builderSource = [
  "character-builder-client.tsx",
  "use-character-builder.ts",
  "character-builder-header.tsx",
  "character-category-rail.tsx",
  "character-preview-stage.tsx",
  "character-attribute-editor.tsx",
  "character-preview.ts",
  "character-import.ts",
]
  .map((file) => readFileSync(new URL(file, workbenchDir), "utf8"))
  .join("\n");
const librarySource = readFileSync(
  new URL("../../src/app/(app)/characters/characters-page-client.tsx", import.meta.url),
  "utf8"
);
const avatarRouteSource = readFileSync(
  new URL("../../src/app/api/avatars/[id]/route.ts", import.meta.url),
  "utf8"
);
const generationRouteSource = readFileSync(
  new URL("../../src/app/api/generate/images/route.ts", import.meta.url),
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
assert.match(builderSource, /Randomize & render/);
assert.match(builderSource, /Re-render preview/);
assert.match(builderSource, /async function randomizeAndRender\(\)/);
assert.match(
  builderSource,
  /const randomizedAttributes = randomCharacterAttributes\(\);[\s\S]*setAttributes\(randomizedAttributes\);[\s\S]*await renderPreview\(\s*randomizedAttributes/
);
assert.doesNotMatch(builderSource, /onClick=\{randomize\}/);
assert.match(
  builderSource,
  /onClick=\{randomizeAndRender\}[\s\S]*disabled=\{saving \|\| rendering\}/
);
assert.match(builderSource, /saveCharacterAvatar/);
assert.match(builderSource, /\/api\/avatars/);
assert.match(builderSource, /\/api\/generate\/images/);
assert.match(builderSource, /\/api\/jobs\//);
assert.match(builderSource, /characterPreview: true/);
assert.match(builderSource, /previewDirty/);
assert.match(builderSource, /previewRequiresRender = previewIsPhotographic \|\| Boolean\(previewFileId\)/);
assert.match(builderSource, /previewHasSource = Boolean\(/);
assert.match(builderSource, /previewSaveBlocked = previewRequiresRender && !readyPreviewFingerprint/);
assert.match(builderSource, /previewKind: readyPreviewFingerprint \? "photographic" : undefined/);
assert.match(builderSource, /readyPreviewFingerprint\s*\? "Character saved and added to reusable avatars"/);
assert.match(builderSource, /: "Character saved as a draft"/);
assert.match(builderSource, /if \(readyPreviewFingerprint\)/);
assert.match(builderSource, /Save as a draft without generating/);
assert.match(builderSource, /useState<string \| null>\(null\)/);
assert.match(builderSource, /savingRef\.current/);
assert.match(builderSource, /Uses one paid image generation per click/);
assert.match(builderSource, /aria-describedby="character-preview-generation-cost"/);
assert.match(builderSource, /aria-busy=\{rendering\}/);
assert.match(builderSource, /disabled=\{saving \|\| rendering \|\| missingEditRecord \|\| previewSaveBlocked\}/);
assert.match(builderSource, /if \(!previewFileId\) return/);
assert.match(builderSource, /onLoadError/);
assert.match(builderSource, /video game character, CGI, 3D render/);
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

function componentPropNames(source: string, exportName: string): string[] {
  const marker = `export function ${exportName}({`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${exportName} should be an exported function`);
  const open = start + marker.length - 1;
  const close = source.indexOf("}: {", open);
  assert.ok(close > open, `${exportName} should destructure typed props`);
  return source
    .slice(open + 1, close)
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

const headerProps = componentPropNames(headerSource, "CharacterBuilderHeader");
const previewProps = componentPropNames(previewSource, "CharacterPreviewStage");
const editorProps = componentPropNames(editorSource, "CharacterAttributeEditor");
assert.deepEqual(headerProps, ["view"]);
assert.deepEqual(previewProps, ["view"]);
assert.deepEqual(editorProps, ["view"]);
assert.match(headerSource, /export type CharacterBuilderHeaderViewModel/);
assert.match(previewSource, /export type CharacterPreviewStageViewModel/);
assert.match(editorSource, /export type CharacterAttributeEditorViewModel/);
assert.match(builderSource, /<CharacterBuilderHeader view=\{headerView\} \/>/);
assert.match(builderSource, /<CharacterPreviewStage view=\{previewView\} \/>/);
assert.match(builderSource, /<CharacterAttributeEditorLazy view=\{attributeView\} \/>/);
assert.doesNotMatch(builderSource, /createContext|useContext/);

const photoMarkup = renderToStaticMarkup(
  <CharacterPhoto alt="Character preview" />
);

assert.match(photoMarkup, /data-character-preview="photographic"/);
assert.match(photoMarkup, /data-character-default-frame="true"/);
assert.doesNotMatch(photoMarkup, /<img/);
assert.doesNotMatch(photoMarkup, /\/character-builder\/default-portrait\.webp/);
assert.doesNotMatch(photoMarkup, /https?:\/\//);

const defaultPortrait = readFileSync(
  new URL("../../public/character-builder/default-portrait.webp", import.meta.url)
);
assert.equal(defaultPortrait.subarray(0, 4).toString("ascii"), "RIFF");
assert.ok(defaultPortrait.length > 8_000, "default portrait should be a real image asset");
assert.ok(defaultPortrait.length < 200_000, "default portrait should stay small enough for LCP");

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
const baselinePromptJson = JSON.parse(baselinePrompt);
assert.equal(baselinePromptJson.schema, "postforge.character-image.v2");
assert.match(
  baselinePromptJson.objective.intended_use,
  /short-form UGC, TikTok-style ads/i
);
assert.match(baselinePromptJson.objective.realism_target, /real person/i);
assert.equal(
  baselinePromptJson.character.identity_anchors.gender_presentation,
  "Female"
);
assert.equal(baselinePromptJson.character.identity_anchors.hair_color, "Black");
assert.equal(baselinePromptJson.character.identity_anchors.hair_style, "Low Bun");
assert.equal(baselinePromptJson.character.identity_anchors.hair_highlights, "None");
assert.match(baselinePromptJson.photographic_direction.capture, /smartphone/i);
assert.match(baselinePromptJson.photographic_direction.lighting, /daylight/i);
assert.ok(
  baselinePromptJson.human_realism.some((rule: string) =>
    /skin pores.*tiny blemishes/i.test(rule)
  )
);
assert.ok(
  baselinePromptJson.attribute_rules.some((rule: string) =>
    /value of None means omit/i.test(rule)
  )
);
for (const exclusion of [
  "video game character",
  "CGI",
  "3D render",
  "digital human",
  "plastic or waxy skin",
]) {
  assert.ok(
    baselinePromptJson.exclusions.includes(exclusion),
    `structured prompt should exclude ${exclusion}`
  );
}
for (const section of CHARACTER_ATTRIBUTE_SECTIONS) {
  for (const group of section.groups) {
    assert.equal(
      baselinePromptJson.character.attribute_recipe[section.id][group.key],
      DEFAULT_CHARACTER_ATTRIBUTES[group.key],
      `${group.label} must keep its exact value in the structured JSON recipe`
    );
  }
}

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
