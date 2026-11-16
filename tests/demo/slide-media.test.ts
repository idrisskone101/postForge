import assert from "node:assert/strict";
import {
  isLocalMediaUrl,
  restrictSlideMediaToLocal,
} from "../../src/lib/demo/slide-media";

assert.equal(isLocalMediaUrl("/api/files/8f1c2d3e-0000-4000-8000-000000000000"), true);
assert.equal(isLocalMediaUrl("/api/collection-assets/abc_123"), true);
assert.equal(isLocalMediaUrl("https://example.com/a.jpg"), false);
assert.equal(isLocalMediaUrl("data:image/png;base64,AAAA"), false);
assert.equal(isLocalMediaUrl("//example.com/a.jpg"), false);
assert.equal(isLocalMediaUrl("/api/files/abc/../../x"), false);
assert.equal(isLocalMediaUrl("/api/files/abc?next=https://example.com"), false);
assert.equal(isLocalMediaUrl(null), false);

const remote = restrictSlideMediaToLocal({
  imageUrl: "https://example.com/a.jpg",
  content: {
    headline: "Kept",
    imageUrls: ["/api/files/abc", "data:image/png;base64,AAAA", 7],
  },
});
assert.equal(remote.imageUrl, null);
assert.deepEqual(remote.content, { headline: "Kept", imageUrls: ["/api/files/abc"] });

const local = restrictSlideMediaToLocal({
  imageUrl: "/api/files/abc",
  content: { headline: "Kept" },
});
assert.equal(local.imageUrl, "/api/files/abc");
assert.deepEqual(local.content, { headline: "Kept" });

assert.equal(restrictSlideMediaToLocal({ imageUrl: null, content: null }).imageUrl, null);

console.log("demo slide media tests passed");
