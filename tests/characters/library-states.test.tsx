import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CharacterIdentityPackNotice,
  CharacterIdentityPackRow,
} from "../../src/app/(app)/characters/characters-identity-pack";
import {
  characterDateMeta,
  formatShortDate,
} from "../../src/app/(app)/characters/characters-helpers";
import { CharactersEmpty } from "../../src/app/(app)/characters/characters-empty";
import { characterDeletionDetail } from "../../src/app/(app)/characters/characters-mutations";
import { characterSaveAction } from "../../src/app/(app)/characters/new/character-save-action";
import { previewStatus } from "../../src/app/(app)/characters/new/character-preview-status";
import type { useIdentityPack } from "../../src/app/(app)/characters/use-identity-pack";
import { DEFAULT_CHARACTER_ATTRIBUTES } from "../../src/lib/character-attributes";
import type { CharacterRecord } from "../../src/lib/characters";

type Identity = ReturnType<typeof useIdentityPack>;

function identity(overrides: Partial<Identity>): Identity {
  return {
    avatarId: "avatar-1",
    pack: null,
    error: null,
    loaded: true,
    retrying: false,
    preparing: false,
    retry: async () => {},
    ...overrides,
  };
}

const row = (value: Identity) =>
  renderToStaticMarkup(<dl><CharacterIdentityPackRow identity={value} /></dl>);

assert.match(row(identity({ loaded: false })), />Checking</);
assert.match(row(identity({})), />Not prepared</);
assert.match(
  row(identity({ preparing: true, pack: { status: "processing", error: null, images: [] } })),
  /data-tone="live"[\s\S]*Preparing/
);
assert.match(
  row(identity({ pack: { status: "completed", error: null, images: [{ id: "a", kind: "core" }, { id: "b", kind: "core" }] } })),
  /data-tone="ok"[\s\S]*2 references/
);
assert.match(
  row(identity({ pack: { status: "failed", error: "Provider timed out", images: [] } })),
  /data-tone="bad"[\s\S]*Failed/
);

const failedNotice = renderToStaticMarkup(
  <CharacterIdentityPackNotice
    identity={identity({ pack: { status: "failed", error: "Provider timed out", images: [] } })}
  />
);
assert.match(failedNotice, /Identity prep failed\./);
assert.match(failedNotice, /Provider timed out/);
assert.match(failedNotice, />Retry identity prep</);
assert.equal(
  renderToStaticMarkup(<CharacterIdentityPackNotice identity={identity({})} />),
  ""
);
assert.match(
  renderToStaticMarkup(<CharacterIdentityPackNotice identity={identity({ error: "Failed to load identity pack" })} />),
  /Identity pack unavailable\.[\s\S]*Failed to load identity pack/
);

const record: CharacterRecord = {
  id: "character_1",
  name: "Ana",
  attributes: DEFAULT_CHARACTER_ATTRIBUTES,
  previewSeed: 0,
  avatarId: null,
  createdAt: "2026-08-07T12:15:46.027Z",
  updatedAt: "2026-08-07T12:15:46.027Z",
};
assert.equal(formatShortDate(record.updatedAt), "7 Aug");
assert.equal(characterDateMeta(record), "Draft, 7 Aug");
assert.equal(
  characterDateMeta({ ...record, avatarId: "avatar-1", previewKind: "photographic" }),
  "7 Aug"
);
assert.equal(characterDeletionDetail(record), "Existing generated outputs stay available.");
assert.match(characterDeletionDetail({ ...record, avatarId: "avatar-1" }), /reusable avatar will also be removed/);

assert.deepEqual(previewStatus(true, true, true), { tone: "live", label: "Rendering" });
assert.deepEqual(previewStatus(false, true, true), { tone: "warn", label: "Changes not rendered" });
assert.deepEqual(previewStatus(false, false, true), { tone: "ok", label: "Preview ready" });
assert.deepEqual(previewStatus(false, false, false), { tone: "neutral", label: "Draft, preview optional" });

// While a render runs the status chip alone says so: Save keeps the name of what it does.
const resting = { saving: false, rendering: false, missingEditRecord: false, previewSaveBlocked: false, readyPreviewFingerprint: null };
assert.deepEqual(characterSaveAction({ ...resting, rendering: true }), { label: "Save draft", title: "Wait for the preview render to finish" });
assert.equal(characterSaveAction({ ...resting, rendering: true, previewSaveBlocked: true }).label, "Preview changed");
assert.equal(characterSaveAction({ ...resting, rendering: true, readyPreviewFingerprint: "character-recipe-v1-0" }).label, "Save");
assert.equal(characterSaveAction({ ...resting, saving: true, rendering: true }).label, "Saving…");

const emptyMarkup = renderToStaticMarkup(<CharactersEmpty />);
assert.match(emptyMarkup, /No characters yet/);
assert.match(emptyMarkup, /href="\/characters\/new"[^>]*>[\s\S]*New character/);

console.log("Characters library state checks passed");
