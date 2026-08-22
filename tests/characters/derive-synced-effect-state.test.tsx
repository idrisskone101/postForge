import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { CharacterPhoto } from "../../src/components/character-photo";

const characterPhoto = readFileSync(
  new URL("../../src/components/character-photo.tsx", import.meta.url),
  "utf8"
);

assert.doesNotMatch(characterPhoto, /useEffect/);
assert.match(characterPhoto, /failedSource/);
assert.match(characterPhoto, /failedSource === requestedSource/);
assert.match(characterPhoto, /setFailedSource\(requestedSource\)/);

const avatarMarkup = renderToStaticMarkup(
  <CharacterPhoto avatarId="avatar-1" alt="Character preview" />
);
assert.match(avatarMarkup, /\/api\/avatars\/avatar-1/);
