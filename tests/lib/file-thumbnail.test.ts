import assert from "node:assert/strict";
import {
  FILE_THUMBNAIL_WIDTHS,
  fileThumbnailSources,
  fileThumbnailWidth,
} from "../../src/lib/file-thumbnail";

assert.deepEqual([...FILE_THUMBNAIL_WIDTHS], [240, 480, 720]);

assert.equal(fileThumbnailWidth(1), 240);
assert.equal(fileThumbnailWidth(240), 240);
assert.equal(fileThumbnailWidth(241), 480);
assert.equal(fileThumbnailWidth(480), 480);
assert.equal(fileThumbnailWidth(5000), 720);
assert.equal(fileThumbnailWidth(Number.NaN), 720);

assert.deepEqual(fileThumbnailSources("/api/files/abc-123"), {
  src: "/api/files/abc-123/thumbnail?w=480",
  srcSet:
    "/api/files/abc-123/thumbnail?w=240 240w, /api/files/abc-123/thumbnail?w=480 480w, /api/files/abc-123/thumbnail?w=720 720w",
});

for (const notStored of [
  "/landscape.jpg",
  "/api/files/abc/download",
  "/api/files/abc#t=0.1",
  "/api/files/abc?x=1",
  "/api/collection-assets/abc",
  "https://example.com/api/files/abc",
  "blob:http://localhost/1",
]) {
  assert.equal(fileThumbnailSources(notStored), null, notStored);
}

console.log("file thumbnail tests passed");
