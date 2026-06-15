import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AvatarCreationCard,
  AvatarImportPanel,
  getAvatarImportReadiness,
  getAvatarOptionLabel,
} from "../src/components/avatar-picker";

assert.equal(getAvatarOptionLabel(0), "Identity 1");
assert.equal(getAvatarOptionLabel(4), "Identity 5");
assert.doesNotMatch(getAvatarOptionLabel(0), /[0-9a-f]{8}-[0-9a-f-]{27}/i);

const creationMarkup = renderToStaticMarkup(
  <AvatarCreationCard
    isUploading={false}
    onUpload={() => {}}
    onGenerate={() => {}}
    onGallery={() => {}}
    onImport={() => {}}
  />
);

assert.match(creationMarkup, /New Avatar/);
assert.doesNotMatch(creationMarkup, /New Identity/);
assert.match(creationMarkup, /data-avatar-action="upload"/);
assert.match(creationMarkup, /data-avatar-action="generate"/);
assert.match(creationMarkup, /data-avatar-action="gallery"/);
assert.match(creationMarkup, /data-avatar-action="import"/);

assert.deepEqual(getAvatarImportReadiness("{\"anything\":true}", 1), {
  canGenerateCandidates: true,
  jsonError: null,
  seedError: null,
});

assert.deepEqual(getAvatarImportReadiness("{bad json", 1), {
  canGenerateCandidates: false,
  jsonError: "Avatar Profile must be valid JSON.",
  seedError: null,
});

assert.equal(getAvatarImportReadiness("[]", 0).seedError, "Add at least 1 Seed Reference Image.");
assert.equal(getAvatarImportReadiness("[]", 6).seedError, "Use no more than 5 Seed Reference Images.");

const importMarkup = renderToStaticMarkup(
  <AvatarImportPanel
    rawJson="{bad json"
    seedReferenceImages={[
      { name: "front.jpg", size: 1000, type: "image/jpeg" },
      { name: "side.jpg", size: 1200, type: "image/jpeg" },
    ]}
    isGeneratingCandidates={false}
    generationError="Candidate generation failed. Your inputs are still available for retry."
    onBack={() => {}}
    onRawJsonChange={() => {}}
    onJsonFileChange={() => {}}
    onSeedReferenceImagesChange={() => {}}
    onRemoveSeedReferenceImage={() => {}}
    onGenerateCandidates={() => {}}
  />
);

assert.match(importMarkup, /Import Avatar/);
assert.match(importMarkup, /Avatar Profile JSON/);
assert.match(importMarkup, /Seed Reference Images/);
assert.match(importMarkup, /accept="application\/json,.json"/);
assert.match(importMarkup, /accept="image\/\*"/);
assert.match(importMarkup, /multiple=""/);
assert.match(importMarkup, /front\.jpg/);
assert.match(importMarkup, /side\.jpg/);
assert.match(importMarkup, /Avatar Profile must be valid JSON\./);
assert.match(importMarkup, /Candidate generation failed\. Your inputs are still available for retry\./);
assert.match(importMarkup, /<button[^>]*disabled=""/);

const readyImportMarkup = renderToStaticMarkup(
  <AvatarImportPanel
    rawJson='{"anything":true}'
    seedReferenceImages={[{ name: "front.jpg", size: 1000, type: "image/jpeg" }]}
    isGeneratingCandidates={false}
    generationError={null}
    onBack={() => {}}
    onRawJsonChange={() => {}}
    onJsonFileChange={() => {}}
    onSeedReferenceImagesChange={() => {}}
    onRemoveSeedReferenceImage={() => {}}
    onGenerateCandidates={() => {}}
  />
);

assert.doesNotMatch(readyImportMarkup, /Avatar Profile must be valid JSON\./);
assert.doesNotMatch(readyImportMarkup, /Add at least 1 Seed Reference Image\./);
assert.match(readyImportMarkup, /<button[^>]*>.*Generate candidates/s);
assert.doesNotMatch(
  readyImportMarkup.match(/<button[^>]*>.*Generate candidates/s)?.[0] ?? "",
  /disabled=""/
);
