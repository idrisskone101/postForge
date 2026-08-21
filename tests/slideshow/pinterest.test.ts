import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { findPinterestCandidates } from "../../src/lib/collections/pinterest-candidates";
import {
  extractPinterestImageUrls,
  extractPinterestSearchCandidates,
} from "../../src/lib/collections/pinterest-extract";
import { buildPinterestSourceUrl } from "../../src/lib/collections/pinterest-source-url";
import { SlideshowApiError } from "../../src/lib/slideshow/errors";
import {
  assertPinImageUrl,
  downloadPinterestImage,
} from "../../src/lib/pinterest-import";
import {
  importPinterestImages,
  pinterestImageUrlsInSelectionOrder,
} from "../../src/lib/collections-client";
import { MAX_PINTEREST_IMPORT_IMAGES } from "../../src/lib/pinterest-constants";

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

assert.equal(
  assertPinImageUrl(`https://i.pinimg.com/736x/${imageA}`),
  `https://i.pinimg.com/736x/${imageA}`,
);
assert.throws(() => assertPinImageUrl("https://example.com/image.jpg"));
await assert.rejects(
  downloadPinterestImage(`https://i.pinimg.com/736x/${imageA}`, async () =>
    new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1/private.jpg" },
    }),
  ),
  (error: unknown) =>
    error instanceof SlideshowApiError && error.code === "invalid_url",
);

assert.deepEqual(
  pinterestImageUrlsInSelectionOrder(
    [
      { id: "first", imageUrl: "https://i.pinimg.com/first.jpg", sourceUrl: "https://pinterest.com/pin/1" },
      { id: "second", imageUrl: "https://i.pinimg.com/second.jpg", sourceUrl: "https://pinterest.com/pin/2" },
    ],
    ["second", "first"],
  ),
  ["https://i.pinimg.com/second.jpg", "https://i.pinimg.com/first.jpg"],
);
await assert.rejects(
  importPinterestImages({
    urls: Array.from(
      { length: MAX_PINTEREST_IMPORT_IMAGES + 1 },
      (_, index) => `https://i.pinimg.com/736x/test-${index}.jpg`,
    ),
  }),
  new RegExp(`Select up to ${MAX_PINTEREST_IMPORT_IMAGES} images`),
);
await assert.rejects(
  downloadPinterestImage(`https://i.pinimg.com/736x/${imageA}`, async () =>
    new Response(new Uint8Array([1]), {
      headers: {
        "content-type": "image/jpeg",
        "content-length": String(16 * 1024 * 1024),
      },
    }),
  ),
  (error: unknown) =>
    error instanceof SlideshowApiError &&
    error.code === "pinterest_image_too_large",
);

const searchCandidates = extractPinterestSearchCandidates(
  {
    resource_response: {
      data: {
        results: [
          {
            type: "pin",
            id: "12345",
            title: "Quiet morning ritual",
            seo_alt_text: "A ceramic cup beside an open journal",
            images: {
              "236x": {
                url: `https://i.pinimg.com/236x/${imageA}`,
                width: 236,
                height: 300,
              },
              "736x": {
                url: `https://i.pinimg.com/736x/${imageA}`,
                width: 736,
                height: 936,
              },
            },
          },
          { type: "board", id: "not-a-pin", images: {} },
        ],
      },
    },
  },
  "https://www.pinterest.com/search/pins/?q=quiet",
);
assert.deepEqual(searchCandidates, [
  {
    id: "pinterest-12345",
    imageUrl: `https://i.pinimg.com/736x/${imageA}`,
    sourceUrl: "https://www.pinterest.com/pin/12345/",
    title: "Quiet morning ritual",
    altText: "A ceramic cup beside an open journal",
    width: 736,
    height: 936,
  },
]);

let requestedUrl = "";
let searchRequestCount = 0;
const successful = await findPinterestCandidates(
  { source: "search", query: "wellness routine" },
  {
    fetchImpl: async (input, init) => {
      searchRequestCount += 1;
      requestedUrl = String(input);
      assert.equal(init?.redirect, "manual");
      if (searchRequestCount === 1) {
        return new Response("<html><body>Application shell</body></html>", {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "pinterest-version": "test-version",
            "set-cookie": "_pinterest_sess=session-value; Path=/; Secure; HttpOnly",
          },
        });
      }
      assert.match(requestedUrl, /BaseSearchResource\/get/);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-app-version"), "test-version");
      assert.equal(headers.get("x-requested-with"), "XMLHttpRequest");
      assert.match(headers.get("cookie") ?? "", /_pinterest_sess=session-value/);
      return Response.json({
        resource_response: {
          bookmark: "cursor-page-2",
          data: {
            results: [
              {
                type: "pin",
                id: "67890",
                images: {
                  "736x": {
                    url: `https://i.pinimg.com/736x/${imageA}`,
                    width: 736,
                    height: 920,
                  },
                },
              },
            ],
          },
        },
      });
    },
  },
);
assert.equal(searchRequestCount, 2);
assert.match(requestedUrl, /^https:\/\/www\.pinterest\.com\/resource\/BaseSearchResource\/get\//);
assert.equal(successful.candidates.length, 1);
assert.equal(successful.candidates[0].imageUrl, `https://i.pinimg.com/736x/${imageA}`);
assert.equal(successful.candidates[0].sourceUrl, "https://www.pinterest.com/pin/67890/");
assert.equal(successful.cursor, "cursor-page-2");
assert.equal(successful.hasMore, true);

let paginatedRequestCount = 0;
const paginated = await findPinterestCandidates(
  {
    source: "search",
    query: "wellness routine",
    cursor: "cursor-page-2",
  },
  {
    fetchImpl: async (input) => {
      paginatedRequestCount += 1;
      if (paginatedRequestCount === 1) {
        return new Response("<html><body>Application shell</body></html>", {
          headers: { "content-type": "text/html" },
        });
      }
      const resourceUrl = new URL(String(input));
      const resourceData = JSON.parse(resourceUrl.searchParams.get("data") ?? "{}");
      assert.deepEqual(resourceData.options.bookmarks, ["cursor-page-2"]);
      return Response.json({
        resource_response: {
          bookmark: "-end-",
          data: {
            results: [
              {
                type: "pin",
                id: "67891",
                images: {
                  "736x": {
                    url: `https://i.pinimg.com/736x/${imageB}`,
                    width: 736,
                    height: 920,
                  },
                },
              },
            ],
          },
        },
      });
    },
  },
);
assert.equal(paginatedRequestCount, 2);
assert.equal(paginated.candidates[0]?.id, "pinterest-67891");
assert.equal(paginated.cursor, null);
assert.equal(paginated.hasMore, false);

await assert.rejects(
  findPinterestCandidates({
    source: "search",
    query: "wellness routine",
    cursor: "x".repeat(8_193),
  }),
  (error: unknown) =>
    error instanceof SlideshowApiError &&
    error.code === "invalid_pinterest_cursor",
);

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

const pinterestDialogSource = [
  "pinterest-import-dialog.tsx",
  "pinterest-import-search.tsx",
  "pinterest-import-results.tsx",
  "pinterest-import-footer.tsx",
]
  .map((file) =>
    readFileSync(new URL(`../../src/components/${file}`, import.meta.url), "utf8"),
  )
  .join("\n");
const creatorViewSource = readFileSync(
  new URL("../../src/components/slideshow/studio-views.tsx", import.meta.url),
  "utf8",
);
const slideshowStudioSource = readFileSync(
  new URL("../../src/components/slideshow/slideshow-studio.tsx", import.meta.url),
  "utf8",
);
assert.match(pinterestDialogSource, /Use .* as slide image/);
assert.match(pinterestDialogSource, /Create style JSON from/);
assert.match(pinterestDialogSource, /importedSelection/);
assert.match(pinterestDialogSource, /idempotencyKey/);
assert.match(pinterestDialogSource, /Load more/);
assert.match(pinterestDialogSource, /loadingMore/);
assert.match(pinterestDialogSource, /MAX_PINTEREST_IMPORT_IMAGES/);
assert.match(
  pinterestDialogSource,
  /\.slice\(0, MAX_PINTEREST_IMPORT_IMAGES\)/,
);
assert.equal(MAX_PINTEREST_IMPORT_IMAGES, 40);
assert.match(creatorViewSource, /Search Pinterest/);
assert.match(creatorViewSource, /Copy JSON/);
assert.match(creatorViewSource, /directImageAssetIds/);
assert.match(creatorViewSource, /Add \$\{label\} image from collections/);
assert.match(creatorViewSource, /openImagePicker\(\{ kind: "hook" \}\)/);
assert.match(creatorViewSource, /alignCreatorDirectImages/);
assert.match(creatorViewSource, /These shape generated slides/);
assert.match(slideshowStudioSource, /slidesToGenerate = saved\.slides\.filter/);
assert.match(slideshowStudioSource, /applyDirectSlideshowImages/);
assert.match(slideshowStudioSource, /collection image/);

  console.log("slideshow Pinterest tests passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
