import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CharacterAttributeEditor,
} from "../../src/app/(app)/characters/new/character-attribute-editor";
import type { CharacterAttributeEditorViewModel } from "../../src/app/(app)/characters/new/types";
import {
  CHARACTER_ATTRIBUTE_SECTIONS,
  DEFAULT_CHARACTER_ATTRIBUTES,
} from "../../src/lib/character-attributes";

function editorView(
  overrides: Partial<CharacterAttributeEditorViewModel> = {}
): CharacterAttributeEditorViewModel {
  return {
    attributes: DEFAULT_CHARACTER_ATTRIBUTES,
    activeSection: "identity",
    active: CHARACTER_ATTRIBUTE_SECTIONS[0],
    error: null,
    onDismissError() {},
    onSelectSection() {},
    copyPrompt() {},
    onImport() {},
    copyAttributes() {},
    selectAttribute() {},
    ...overrides,
  };
}

const identity = CHARACTER_ATTRIBUTE_SECTIONS.find(
  (section) => section.id === "identity"
);
const faceDetails = CHARACTER_ATTRIBUTE_SECTIONS.find(
  (section) => section.id === "face-details"
);
assert.ok(identity);
assert.ok(faceDetails);

const identityMarkup = renderToStaticMarkup(
  <CharacterAttributeEditor
    view={editorView({ activeSection: "identity", active: identity })}
  />
);
assert.match(identityMarkup, /data-character-attribute-editor/);
assert.match(identityMarkup, />Identity</);
assert.match(identityMarkup, /Copy prompt/);
assert.match(identityMarkup, /Import prompt or JSON/);
assert.match(identityMarkup, /Copy attributes JSON/);
assert.match(identityMarkup, /&quot;identity&quot;: \{/);
assert.match(identityMarkup, /Next: Ethnicity/);
assert.match(identityMarkup, /Gender/);
assert.match(identityMarkup, /Female/);
assert.match(identityMarkup, /Male/);
assert.match(identityMarkup, /Non-binary/);
assert.match(identityMarkup, /aria-pressed="true"/);

const faceMarkup = renderToStaticMarkup(
  <CharacterAttributeEditor
    view={editorView({ activeSection: "face-details", active: faceDetails })}
  />
);
assert.match(faceMarkup, /type="range"/);
assert.match(faceMarkup, /aria-label="Lip fullness"/);
assert.match(faceMarkup, /72%/);

const errorMarkup = renderToStaticMarkup(
  <CharacterAttributeEditor
    view={editorView({ error: "Unable to save character" })}
  />
);
assert.match(errorMarkup, /role="alert"/);
assert.match(errorMarkup, /Unable to save character/);
assert.match(errorMarkup, /Dismiss error/);

const typesSource = readFileSync(
  new URL(
    "../../src/app/(app)/characters/new/types.ts",
    import.meta.url
  ),
  "utf8"
);
assert.match(typesSource, /export type CharacterAttributeEditorViewModel/);

const editorSource = readFileSync(
  new URL(
    "../../src/app/(app)/characters/new/character-attribute-editor.tsx",
    import.meta.url
  ),
  "utf8"
);
assert.match(editorSource, /onClick=\{copyPrompt\}/);
assert.match(editorSource, /onSelectSection\(next\.id\)/);
assert.match(editorSource, /selectAttribute\(group\.key, option\)/);
assert.match(editorSource, /selectAttribute\(group\.key, event\.target\.value\)/);
assert.doesNotMatch(editorSource, /createContext|useContext/);
assert.doesNotMatch(editorSource, /demo character/i);

console.log("Character attribute editor view-model checks passed");
