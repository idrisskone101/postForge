import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { CharacterPhoto } from "../../src/components/character-photo";

const characterPhoto = readFileSync(
  new URL("../../src/components/character-photo.tsx", import.meta.url),
  "utf8"
);

assert.doesNotMatch(characterPhoto, /useEffect/);
assert.match(characterPhoto, /failure\?\.source === requestedSource/);
assert.match(characterPhoto, /setFailure\(\{ source: requestedSource, stage: "resized" \}\)/);
assert.match(characterPhoto, /setFailure\(\{ source: requestedSource, stage: "original" \}\)/);

const avatarMarkup = renderToStaticMarkup(
  <CharacterPhoto avatarId="avatar-1" alt="Character preview" />
);
assert.match(avatarMarkup, /\/api\/avatars\/avatar-1/);
assert.doesNotMatch(avatarMarkup, /srcSet|srcset/);

const tileMarkup = renderToStaticMarkup(
  <CharacterPhoto avatarId="avatar-1" alt="Character preview" sizes="200px" />
);
assert.match(tileMarkup, /src="\/api\/avatars\/avatar-1"/);
assert.match(tileMarkup, /srcSet="\/characters\/portrait\/avatar-1\?w=320 320w, \/characters\/portrait\/avatar-1\?w=480 480w, \/characters\/portrait\/avatar-1\?w=720 720w"/);
assert.match(tileMarkup, /sizes="200px"/);
assert.match(tileMarkup, /loading="lazy"/);

const previewMarkup = renderToStaticMarkup(
  <CharacterPhoto generatedFileId="file-1" sizes="264px" priority />
);
assert.match(previewMarkup, /\/api\/files\/file-1/);
assert.doesNotMatch(previewMarkup, /srcSet|srcset/);
assert.match(previewMarkup, /fetchPriority="high"|fetchpriority="high"/);
