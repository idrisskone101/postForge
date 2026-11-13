import assert from "node:assert/strict";
import {
  FILE_THUMBNAIL_WIDTHS,
  fileThumbnailLoader,
  fileThumbnailWidth,
  hasFileThumbnail,
} from "../../src/lib/file-thumbnail";

assert.deepEqual([...FILE_THUMBNAIL_WIDTHS], [240, 480, 720]);

assert.equal(fileThumbnailWidth(1), 240);
assert.equal(fileThumbnailWidth(240), 240);
assert.equal(fileThumbnailWidth(241), 480);
assert.equal(fileThumbnailWidth(480), 480);
assert.equal(fileThumbnailWidth(5000), 720);
assert.equal(fileThumbnailWidth(Number.NaN), 720);

// next/image asks for rungs of its own ladder; each maps to a variant that covers its slot.
for (const [rung, variant] of [
  [16, 240],
  [256, 240],
  [384, 480],
  [640, 480],
  [750, 720],
  [3840, 720],
] as const) {
  assert.equal(
    fileThumbnailLoader({ src: "/api/files/abc-123", width: rung }),
    `/api/files/abc-123/thumbnail?w=${variant}`,
  );
}

assert.equal(hasFileThumbnail("/api/files/abc-123"), true);
for (const notStored of [
  "/landscape.jpg",
  "/api/files/abc/download",
  "/api/files/abc#t=0.1",
  "/api/files/abc?x=1",
  "/api/collection-assets/abc",
  "https://example.com/api/files/abc",
  "blob:http://localhost/1",
]) {
  assert.equal(hasFileThumbnail(notStored), false, notStored);
}

console.log("file thumbnail tests passed");
