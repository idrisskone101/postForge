import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCloneSourceUrlHandoffHref,
  consumeCloneHandoffQuery,
  isSupportedCloneReferenceFile,
  readCloneHandoffQuery,
  savedSourceMatchesHandoffUrl,
  tikTokVideoIdFromUrl,
} from "../../src/lib/ugc-clone-handoff";
import { cloneHandoffAfterPreselect } from "../../src/app/(app)/ugc-clone/clone-form-models";
import {
  buildCloneOutputHandoffUrl,
  handoffCloneOutput,
  updateCloneOutputReviewStatus,
} from "../../src/lib/clone-output-actions";

const cloneFormHookSource = readFileSync(
  new URL("../../src/app/(app)/ugc-clone/use-clone-form.ts", import.meta.url),
  "utf8"
);
const cloneRefImagesSource = readFileSync(
  new URL("../../src/app/(app)/ugc-clone/use-clone-ref-images.ts", import.meta.url),
  "utf8"
);
const cloneRequestsSource = readFileSync(
  new URL("../../src/app/(app)/ugc-clone/clone-requests.ts", import.meta.url),
  "utf8"
);
const cloneRouteSource = readFileSync(
  new URL("../../src/app/api/ugc-clone/generate/route.ts", import.meta.url),
  "utf8"
);
const cloneServiceSource = readFileSync(
  new URL("../../src/lib/ugc/generate-clone.ts", import.meta.url),
  "utf8"
);
const sourcePickerSource = readFileSync(
  new URL("../../src/components/tiktok-input.tsx", import.meta.url),
  "utf8"
);
const cloneReferenceLibrarySource = readFileSync(
  new URL("../../src/components/clone/reference-library.tsx", import.meta.url),
  "utf8"
);

assert.match(cloneReferenceLibrarySource, /CollectionReferencePicker/);
assert.match(cloneRequestsSource, /collectionAssetId: input\.target\.collectionAssetId/);
assert.match(cloneFormHookSource, /kind: "collection"/);
assert.match(cloneFormHookSource, /collectionAssetId: selectedCollectionAssetId/);
assert.match(cloneRouteSource, /Choose only one clone reference source/);
assert.match(cloneServiceSource, /findCollectionAsset/);
assert.match(cloneRefImagesSource, /let shouldConsumeQuery = false/);
assert.match(cloneRefImagesSource, /\[400, 404, 410, 415, 422\]\.includes\(response\.status\)/);
assert.match(cloneRefImagesSource, /if \(!cancelled && shouldConsumeQuery\)/);
assert.match(sourcePickerSource, /status: "missing"/);
assert.match(sourcePickerSource, /isLoadingSources \|\| sourcesError/);
assert.match(sourcePickerSource, /handed-off saved source is no longer available/);
assert.match(cloneFormHookSource, /sourceUrl: sourceUrlParam/);
assert.match(sourcePickerSource, /handoffSourceUrl/);
assert.match(sourcePickerSource, /savedSourceMatchesHandoffUrl/);
assert.doesNotMatch(sourcePickerSource, /originalUrl\.includes\(videoId\)/);

const handoffQuery = new URLSearchParams(
  "sourceId=source-1&referenceFileId=file-2&utm_source=gallery&debug=1"
);
assert.deepEqual(readCloneHandoffQuery(handoffQuery), {
  sourceId: "source-1",
  referenceFileId: "file-2",
  sourceUrl: null,
});
assert.equal(
  readCloneHandoffQuery(
    new URLSearchParams("sourceUrl=https://www.tiktok.com/@creator/video/1")
  ).sourceUrl,
  "https://www.tiktok.com/@creator/video/1"
);
assert.equal(
  buildCloneSourceUrlHandoffHref("https://www.tiktok.com/@creator/video/1"),
  "/ugc-clone?sourceUrl=https%3A%2F%2Fwww.tiktok.com%2F%40creator%2Fvideo%2F1"
);
assert.equal(
  consumeCloneHandoffQuery(handoffQuery.toString(), "sourceId"),
  "referenceFileId=file-2&utm_source=gallery&debug=1"
);

assert.equal(
  isSupportedCloneReferenceFile({
    id: "image-1",
    type: "image",
    mimeType: "image/png",
    width: 1080,
    height: 1920,
    filename: "reference.png",
  }),
  true
);
assert.equal(
  isSupportedCloneReferenceFile({
    id: "video-1",
    type: "video",
    mimeType: "video/mp4",
    width: 1080,
    height: 1920,
    filename: "output.mp4",
  }),
  false
);
assert.equal(
  consumeCloneHandoffQuery(handoffQuery.toString(), "referenceFileId"),
  "sourceId=source-1&utm_source=gallery&debug=1"
);
assert.equal(tikTokVideoIdFromUrl("https://www.tiktok.com/@creator/video/123"), "123");
assert.equal(
  savedSourceMatchesHandoffUrl(
    "https://www.tiktok.com/@creator/video/123",
    "https://www.tiktok.com/@other/video/123"
  ),
  true
);
assert.equal(
  savedSourceMatchesHandoffUrl(
    "https://www.tiktok.com/@creator/video/1234",
    "https://www.tiktok.com/@creator/video/123"
  ),
  false
);
assert.deepEqual(
  cloneHandoffAfterPreselect({
    result: {
      handoff: "sourceUrl",
      status: "missing",
      sourceUrl: "https://www.tiktok.com/@creator/video/1",
    },
    sourceUrlParam: "https://www.tiktok.com/@creator/video/1",
    pendingSourceId: null,
    search: "sourceUrl=https%3A%2F%2Fwww.tiktok.com%2F%40creator%2Fvideo%2F1&utm_source=gallery",
  }),
  {
    path: "/ugc-clone?utm_source=gallery",
    error:
      "The handed-off source could not be imported. Paste the TikTok URL or choose a saved source.",
    clearPendingSourceId: false,
  }
);
assert.equal(
  cloneHandoffAfterPreselect({
    result: { handoff: "sourceId", status: "selected", sourceId: "source-2" },
    sourceUrlParam: null,
    pendingSourceId: "source-1",
    search: "sourceId=source-1",
  }),
  null
);

assert.equal(
  buildCloneOutputHandoffUrl("file id/1", "https://postforge.test"),
  "https://postforge.test/api/files/file%20id%2F1"
);

void (async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const status = await updateCloneOutputReviewStatus({
    outputId: "file-1",
    reviewStatus: "approved_output",
    request: (async (url, init) => {
      requests.push({ url: String(url), init });
      return Response.json({
        reviewStatus: {
          value: "approved_output",
          label: "Approved Output",
          tone: "approved",
        },
      });
    }) as typeof fetch,
  });

  assert.deepEqual(status, {
    value: "approved_output",
    label: "Approved Output",
    tone: "approved",
  });
  assert.equal(requests[0]?.url, "/api/files/file-1/review-status");
  assert.equal(requests[0]?.init?.method, "PATCH");
  assert.equal(
    requests[0]?.init?.body,
    JSON.stringify({ reviewStatus: "approved_output" })
  );

  let copied = "";
  const copiedUrl = await handoffCloneOutput({
    outputId: "file-1",
    origin: "https://postforge.test",
    writeText: async (value) => {
      copied = value;
    },
  });
  assert.equal(copiedUrl, "https://postforge.test/api/files/file-1");
  assert.equal(copied, copiedUrl);
})();
