import assert from "node:assert/strict";
import {
  isStoragePathUnder,
  normalizeStoragePath,
} from "../../src/lib/storage";

assert.equal(normalizeStoragePath("videos/clip.mp4"), "videos/clip.mp4");
assert.equal(normalizeStoragePath("foo/./bar"), "foo/bar");
assert.equal(normalizeStoragePath("foo/../bar"), "bar");
assert.equal(normalizeStoragePath("collection-assets"), "collection-assets");

assert.throws(() => normalizeStoragePath(""), /Invalid storage path/);
assert.throws(() => normalizeStoragePath("/abs/path"), /Invalid storage path/);
assert.throws(() => normalizeStoragePath("foo\\bar"), /Invalid storage path/);
assert.throws(() => normalizeStoragePath("."), /Invalid storage path/);
assert.throws(() => normalizeStoragePath(".."), /Invalid storage path/);
assert.throws(() => normalizeStoragePath("../secret"), /Invalid storage path/);
assert.throws(() => normalizeStoragePath("foo/.."), /Invalid storage path/);
assert.throws(() => normalizeStoragePath("foo bar"), /Invalid storage path/);
assert.throws(() => normalizeStoragePath("foo/bar baz"), /Invalid storage path/);

assert.equal(isStoragePathUnder("videos/a.mp4", ["videos"]), true);
assert.equal(isStoragePathUnder("videos", ["videos"]), true);
assert.equal(isStoragePathUnder("videos-extra/a.mp4", ["videos"]), false);
assert.equal(isStoragePathUnder("other/a.mp4", ["videos"]), false);
assert.equal(isStoragePathUnder("../videos/a.mp4", ["videos"]), false);
assert.equal(isStoragePathUnder("/videos/a.mp4", ["videos"]), false);
assert.equal(isStoragePathUnder("", ["videos"]), false);

console.log("Storage path helper tests passed");
