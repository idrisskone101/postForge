import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { GenerateOutputActions } from "../src/components/generate-output-actions";
import {
  buildCloneHandoffHref,
  buildContinueVideoHref,
  buildEnhancementRequest,
  buildGenerateSimilarHref,
  clampPreviewZoom,
  getGenerationStatusCopy,
  type JobDetail,
} from "../src/lib/generation-editor";

const generationFormSource = readFileSync(
  new URL("../src/components/generation-form.tsx", import.meta.url),
  "utf8"
);
const generationDetailSource = readFileSync(
  new URL("../src/app/generate/[id]/page.tsx", import.meta.url),
  "utf8"
);
const imageRouteSource = readFileSync(
  new URL("../src/app/api/generate/images/route.ts", import.meta.url),
  "utf8"
);
const videoRouteSource = readFileSync(
  new URL("../src/app/api/generate/videos/route.ts", import.meta.url),
  "utf8"
);
const collectionsSource = readFileSync(
  new URL("../src/app/collections/collections-page-client.tsx", import.meta.url),
  "utf8"
);

assert.match(generationFormSource, /CollectionReferencePicker/);
assert.match(generationFormSource, /collectionAssetIds/);
assert.match(imageRouteSource, /resolveCollectionImageReferences/);
assert.match(videoRouteSource, /collectionAssetIds/);
assert.match(collectionsSource, /uploadedAssetIds/);
assert.match(collectionsSource, /targetCollection/);
assert.match(generationFormSource, /\[overflow-wrap:anywhere\]/);
assert.match(generationDetailSource, /\[overflow-wrap:anywhere\]/);
assert.match(generationDetailSource, /flex flex-wrap justify-center gap-2/);

assert.equal(clampPreviewZoom(31), 50);
assert.equal(clampPreviewZoom(106), 110);
assert.equal(clampPreviewZoom(199), 150);

assert.equal(
  buildGenerateSimilarHref({
    prompt: "Morning routine & bright bottle",
    model: "nano-banana-2",
  }),
  "/generate?prompt=Morning%20routine%20%26%20bright%20bottle&model=nano-banana-2"
);
assert.equal(
  buildCloneHandoffHref("file/id"),
  "/ugc-clone?referenceFileId=file%2Fid"
);
assert.equal(buildCloneHandoffHref(), "/ugc-clone");

const continueVideoHref = buildContinueVideoHref(
  {
    type: "video",
    prompt: "Month three progress",
    model: "kling-3.0",
  },
  "output-1"
);
assert.match(continueVideoHref, /^\/generate\?/);
assert.match(continueVideoHref, /prompt=Month%20three%20progress/);
assert.match(continueVideoHref, /referenceFileId=output-1/);
assert.match(continueVideoHref, /model=kling-3\.0-i2v/);
assert.doesNotMatch(continueVideoHref, /model=kling-3\.0&/);
assert.equal(
  buildContinueVideoHref({ type: "video", prompt: "Next", model: "veo3" }),
  "/generate?prompt=Next&model=kling-3.0-i2v"
);
assert.throws(
  () => buildContinueVideoHref({ type: "image", prompt: "Shot", model: "nano-banana-2" }),
  /Only video outputs/
);

assert.equal(getGenerationStatusCopy("queued").title, "Queued for generation");
assert.equal(getGenerationStatusCopy("processing").label, "Processing");
assert.equal(getGenerationStatusCopy("failed").title, "Generation stopped");
assert.equal(getGenerationStatusCopy("completed").label, "Completed");

const imageJob: Pick<JobDetail, "type" | "prompt" | "model" | "input"> = {
  type: "image",
  prompt: "A creator holding a coral bottle",
  model: "nano-banana-2",
  input: {
    aspectRatio: "4:5",
    negativePrompt: "distorted hands",
  },
};

const enhancement = buildEnhancementRequest({
  job: imageJob,
  outputId: "file-1",
  instruction: "Sharpen the label",
  editStrength: 42,
  preserveSubject: true,
});

assert.equal(enhancement.model, "nano-banana-2");
assert.equal(enhancement.aspectRatio, "4:5");
assert.equal(enhancement.numImages, 1);
assert.deepEqual(enhancement.referenceFileIds, ["file-1"]);
assert.equal(enhancement.editEndpoint, true);
assert.match(enhancement.prompt, /Sharpen the label/);
assert.match(enhancement.prompt, /Preserve the subject identity/);
assert.match(enhancement.prompt, /42% strength/);
assert.throws(
  () =>
    buildEnhancementRequest({
      job: { ...imageJob, type: "video" },
      outputId: "video-1",
      instruction: "Relight",
      editStrength: 50,
      preserveSubject: true,
    }),
  /Only image outputs/
);

const actionMarkup = renderToStaticMarkup(
  <GenerateOutputActions
    canDownload
    isRetrying={false}
    actionError="Download failed. Try again."
    onDownload={() => {}}
    onRetry={() => {}}
    onSaveToGallery={() => {}}
    onUseInClone={() => {}}
    onGenerateSimilar={() => {}}
    onAddToAutomation={() => {}}
  />
);

assert.match(actionMarkup, /role="alert"/);
assert.match(actionMarkup, /Download failed\. Try again\./);
assert.match(actionMarkup, /Generate similar/);
assert.match(actionMarkup, /Use in Clone/);
assert.match(actionMarkup, /Add to automation/);
assert.match(actionMarkup, /aria-label="Save to Gallery"/);
