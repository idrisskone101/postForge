import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AvatarOptionCard,
  AvatarCreationCard,
  AvatarActionErrorNotice,
  AvatarImportPanel,
  buildAvatarGenerationPrompt,
  getAvatarActionErrorMessage,
  getAvatarImportReadiness,
  getAvatarOptionLabel,
} from "../src/components/avatar-picker";

assert.equal(
  getAvatarActionErrorMessage(new Error("Upload service unavailable"), "Upload failed"),
  "Upload service unavailable"
);
assert.equal(getAvatarActionErrorMessage(null, "Upload failed"), "Upload failed");

const avatarErrorMarkup = renderToStaticMarkup(
  <AvatarActionErrorNotice message="Avatar upload failed." onDismiss={() => {}} />
);
assert.match(avatarErrorMarkup, /role="alert"/);
assert.match(avatarErrorMarkup, /Avatar upload failed/);
assert.match(avatarErrorMarkup, /Dismiss avatar error/);

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

const generatedAvatarPrompt = buildAvatarGenerationPrompt(
  "white cami close-up selfie with soft smile"
);

assert.match(generatedAvatarPrompt, /Pinterest-style pretty girl/i);
assert.match(generatedAvatarPrompt, /soft baddie/i);
assert.match(generatedAvatarPrompt, /iPhone influencer selfie/i);
assert.match(generatedAvatarPrompt, /natural iPhone/i);
assert.match(generatedAvatarPrompt, /slight grain/i);
assert.match(generatedAvatarPrompt, /realistic skin texture/i);
assert.match(generatedAvatarPrompt, /not overly polished/i);
assert.match(generatedAvatarPrompt, /not glossy AI/i);
assert.match(generatedAvatarPrompt, /approachable/i);
assert.match(generatedAvatarPrompt, /white cami close-up selfie with soft smile/i);
assert.doesNotMatch(generatedAvatarPrompt, /studio lighting/i);
assert.doesNotMatch(generatedAvatarPrompt, /Professional headshot/i);

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
assert.match(readyImportMarkup, /<button[^>]*>[\s\S]*Generate candidates/);
assert.doesNotMatch(
  readyImportMarkup.match(/<button[^>]*>[\s\S]*Generate candidates/)?.[0] ?? "",
  /disabled=""/
);

const importedPreparingMarkup = renderToStaticMarkup(
  <AvatarOptionCard
    avatar={{
      id: "avatar-imported",
      name: "Imported Creator",
      createdAt: "2026-06-14T12:00:00.000Z",
      origin: "imported",
      identityPack: { id: "pack-queued", status: "queued", error: null },
    }}
    label="Identity 1"
    isSelected={false}
    onSelect={() => {}}
    onDelete={() => {}}
  />
);

assert.match(importedPreparingMarkup, /Imported/);
assert.match(importedPreparingMarkup, /Identity preparing/);

const importedReadyMarkup = renderToStaticMarkup(
  <AvatarOptionCard
    avatar={{
      id: "avatar-ready",
      name: "Ready Creator",
      createdAt: "2026-06-14T12:00:00.000Z",
      origin: "imported",
      identityPack: { id: "pack-ready", status: "completed", error: null },
    }}
    label="Identity 2"
    isSelected={false}
    onSelect={() => {}}
    onDelete={() => {}}
  />
);

assert.match(importedReadyMarkup, /Imported/);
assert.match(importedReadyMarkup, /Identity ready/);

const importedFailedMarkup = renderToStaticMarkup(
  <AvatarOptionCard
    avatar={{
      id: "avatar-failed",
      name: "Failed Creator",
      createdAt: "2026-06-14T12:00:00.000Z",
      origin: "imported",
      identityPack: { id: "pack-failed", status: "failed", error: "Generation failed" },
    }}
    label="Identity 3"
    isSelected={false}
    onSelect={() => {}}
    onDelete={() => {}}
  />
);

assert.match(importedFailedMarkup, /Imported/);
assert.match(importedFailedMarkup, /Identity failed - retry available/);
assert.match(importedFailedMarkup, /Identity 3/);
