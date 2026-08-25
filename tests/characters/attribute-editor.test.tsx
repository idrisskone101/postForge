import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CharacterAttributeEditor,
  type CharacterAttributeEditorViewModel,
} from "../../src/app/(app)/characters/new/character-attribute-editor";
import {
  CHARACTER_ATTRIBUTE_SECTIONS,
  DEFAULT_CHARACTER_ATTRIBUTES,
} from "../../src/lib/character-attributes";

function editorView(
  overrides: Partial<CharacterAttributeEditorViewModel> = {}
): CharacterAttributeEditorViewModel {
  return {
    attributes: DEFAULT_CHARACTER_ATTRIBUTES,
    activeSection: "overview",
    active: undefined,
    error: null,
    onDismissError() {},
    onSelectSection() {},
    copyPrompt() {},
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

const overviewMarkup = renderToStaticMarkup(
  <CharacterAttributeEditor view={editorView()} />
);
assert.match(overviewMarkup, /data-character-attribute-editor="true"/);
assert.match(overviewMarkup, /Copy prompt/);
assert.match(overviewMarkup, /Character blueprint/);
assert.match(overviewMarkup, /Identity/);
assert.match(overviewMarkup, /Skin Details/);
assert.doesNotMatch(overviewMarkup, /aria-pressed/);

const identityMarkup = renderToStaticMarkup(
  <CharacterAttributeEditor
    view={editorView({ activeSection: "identity", active: identity })}
  />
);
assert.match(identityMarkup, />Identity</);
assert.match(identityMarkup, /Gender/);
assert.match(identityMarkup, /Female/);
assert.match(identityMarkup, /Male/);
assert.match(identityMarkup, /Non-binary/);
assert.match(identityMarkup, /aria-pressed="true"/);
assert.doesNotMatch(identityMarkup, /Copy prompt/);

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

const editorSource = readFileSync(
  new URL(
    "../../src/app/(app)/characters/new/character-attribute-editor.tsx",
    import.meta.url
  ),
  "utf8"
);
assert.match(editorSource, /export type CharacterAttributeEditorViewModel/);
assert.match(editorSource, /onClick=\{copyPrompt\}/);
assert.match(editorSource, /onSelectSection\(section\.id\)/);
assert.match(editorSource, /selectAttribute\(group\.key, option\)/);
assert.match(editorSource, /selectAttribute\(group\.key, event\.target\.value\)/);
assert.doesNotMatch(editorSource, /createContext|useContext/);
assert.doesNotMatch(editorSource, /demo character/i);

console.log("Character attribute editor view-model checks passed");
