import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  consumeCloneHandoffQuery,
  isSupportedCloneReferenceFile,
  readCloneHandoffQuery,
} from "../../src/lib/ugc-clone-handoff";
import {
  buildCloneOutputHandoffUrl,
  handoffCloneOutput,
  updateCloneOutputReviewStatus,
} from "../../src/lib/clone-output-actions";

const cloneFormSource = readFileSync(
  new URL("../../src/components/ugc-clone-form.tsx", import.meta.url),
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
assert.match(cloneFormSource, /collectionAssetId: selectedCollectionAssetId/);
assert.match(cloneRouteSource, /Choose only one clone reference source/);
assert.match(cloneServiceSource, /findCollectionAsset/);
assert.match(cloneFormSource, /let shouldConsumeQuery = false/);
assert.match(cloneFormSource, /\[400, 404, 410, 415, 422\]\.includes\(response\.status\)/);
assert.match(cloneFormSource, /if \(!cancelled && shouldConsumeQuery\)/);
assert.match(sourcePickerSource, /status: "missing"/);
assert.match(sourcePickerSource, /isLoadingSources \|\| sourcesError/);
assert.match(sourcePickerSource, /handed-off saved source is no longer available/);

const handoffQuery = new URLSearchParams(
  "sourceId=source-1&referenceFileId=file-2&utm_source=gallery&debug=1"
);
assert.deepEqual(readCloneHandoffQuery(handoffQuery), {
  sourceId: "source-1",
  referenceFileId: "file-2",
});
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
