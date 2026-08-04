import assert from "node:assert/strict";

import { SlideshowApiError } from "../src/lib/slideshow/errors";
import {
  buildPinterestSourceUrl,
  extractPinterestImageUrls,
  findPinterestCandidates,
} from "../src/lib/pinterest";

async function main() {
const searchUrl = buildPinterestSourceUrl("search", " calm desk ");
assert.equal(searchUrl.origin, "https://www.pinterest.com");
assert.equal(searchUrl.pathname, "/search/pins/");
assert.equal(searchUrl.searchParams.get("q"), "calm desk");

const boardUrl = buildPinterestSourceUrl(
  "board",
  "https://www.pinterest.com/creator/calm-board/?utm_source=share#pins",
);
assert.equal(boardUrl.href, "https://www.pinterest.com/creator/calm-board/");

for (const unsafeUrl of [
  "http://www.pinterest.com/creator/board",
  "https://pinterest.example/creator/board",
  "https://pinterest.com.evil.example/creator/board",
  "https://user:secret@www.pinterest.com/creator/board",
  "https://www.pinterest.com/search/pins",
]) {
  assert.throws(
    () => buildPinterestSourceUrl("board", unsafeUrl),
    (error: unknown) =>
      error instanceof SlideshowApiError && error.status === 400,
    unsafeUrl,
  );
}

const imageA = "aa/bb/cc/image-a.jpg";
const imageB = "11/22/33/image-b.webp";
const extracted = extractPinterestImageUrls(`
  <img src="https://i.pinimg.com/236x/${imageA}">
  <img srcset="https://i.pinimg.com/736x/${imageA} 2x">
  <script>{"image":"https:\\/\\/i.pinimg.com\\/originals\\/${imageA}"}</script>
  <script>{"image":"https\\u003A\\u002F\\u002Fi.pinimg.com\\u002F474x\\u002F${imageB}"}</script>
  <img src="https://i.pinimg.com/75x/avatar.jpg">
  <img src="https://evil.example/736x/not-pinterest.jpg">
  <img src="https://i.pinimg.com/736x/not-supported.gif">
`);
assert.deepEqual(extracted, [
  `https://i.pinimg.com/736x/${imageA}`,
  `https://i.pinimg.com/474x/${imageB}`,
]);

let requestedUrl = "";
const successful = await findPinterestCandidates(
  { source: "search", query: "wellness routine" },
  {
    fetchImpl: async (input, init) => {
      requestedUrl = String(input);
      assert.equal(init?.redirect, "manual");
      return new Response(
        `<img src="https://i.pinimg.com/736x/${imageA}">`,
        { headers: { "content-type": "text/html; charset=utf-8" } },
      );
    },
  },
);
assert.match(requestedUrl, /^https:\/\/www\.pinterest\.com\/search\/pins\//);
assert.equal(successful.candidates.length, 1);
assert.equal(successful.candidates[0].imageUrl, `https://i.pinimg.com/736x/${imageA}`);
assert.equal(successful.candidates[0].sourceUrl, requestedUrl);

let redirectCalls = 0;
const redirected = await findPinterestCandidates(
  { source: "board", query: "https://pin.it/abc123" },
  {
    fetchImpl: async () => {
      redirectCalls += 1;
      if (redirectCalls === 1) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://www.pinterest.com/creator/calm-board/" },
        });
      }
      return new Response(
        `<img src="https://i.pinimg.com/474x/${imageB}">`,
        { headers: { "content-type": "text/html" } },
      );
    },
  },
);
assert.equal(redirectCalls, 2);
assert.equal(
  redirected.sourceUrl,
  "https://www.pinterest.com/creator/calm-board/",
);

await assert.rejects(
  findPinterestCandidates(
    { source: "board", query: "https://pin.it/unsafe" },
    {
      fetchImpl: async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/private" },
        }),
    },
  ),
  (error: unknown) =>
    error instanceof SlideshowApiError && error.code === "invalid_pinterest_url",
);

let redirectLimitCalls = 0;
await assert.rejects(
  findPinterestCandidates(
    { source: "board", query: "https://pin.it/redirect-loop" },
    {
      fetchImpl: async () => {
        redirectLimitCalls += 1;
        return new Response(null, {
          status: 302,
          headers: { location: "https://pin.it/redirect-loop" },
        });
      },
    },
  ),
  (error: unknown) =>
    error instanceof SlideshowApiError && error.code === "pinterest_redirect_limit",
);
assert.equal(redirectLimitCalls, 4);

await assert.rejects(
  findPinterestCandidates(
    { source: "board", query: "https://www.pinterest.com/creator/empty/" },
    {
      fetchImpl: async () =>
        new Response("<html><body>No pins</body></html>", {
          headers: { "content-type": "text/html" },
        }),
    },
  ),
  (error: unknown) =>
    error instanceof SlideshowApiError && error.code === "pinterest_no_images",
);

await assert.rejects(
  findPinterestCandidates(
    { source: "board", query: "https://www.pinterest.com/creator/blocked/" },
    {
      fetchImpl: async () =>
        new Response("blocked", {
          status: 403,
          headers: { "content-type": "text/html" },
        }),
    },
  ),
  (error: unknown) =>
    error instanceof SlideshowApiError && error.code === "pinterest_unavailable",
);

await assert.rejects(
  findPinterestCandidates(
    { source: "board", query: "https://www.pinterest.com/creator/huge/" },
    {
      fetchImpl: async () =>
        new Response("small body", {
          headers: {
            "content-type": "text/html",
            "content-length": String(5 * 1024 * 1024 + 1),
          },
        }),
    },
  ),
  (error: unknown) =>
    error instanceof SlideshowApiError &&
    error.code === "pinterest_response_too_large",
);

  console.log("slideshow Pinterest tests passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
