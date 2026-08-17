import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  appendAvatarCandidateSet,
  AvatarImportPanel,
  buildAvatarCandidateGenerationRequest,
  getDefaultAvatarImportName,
  resetAvatarImportDraft,
} from "../../src/components/avatar-picker";

const request = buildAvatarCandidateGenerationRequest({
  rawJson: JSON.stringify({ name: "Imported Creator", tone: "warm" }),
  seedReferenceImageUrls: [
    "data:image/jpeg;base64,front",
    "data:image/jpeg;base64,side",
    "data:image/jpeg;base64,smile",
  ],
});

assert.equal(request.model, "nano-banana-2");
assert.equal(request.numImages, 3);
assert.equal(request.aspectRatio, "9:16");
assert.deepEqual(request.referenceImageUrls, [
  "data:image/jpeg;base64,front",
  "data:image/jpeg;base64,side",
  "data:image/jpeg;base64,smile",
]);
// Identity matching
assert.match(request.prompt, /single-image avatar candidates/i);
assert.match(request.prompt, /standalone vertical 9:16 selfie/i);
assert.match(request.prompt, /match the Seed Reference Images closely/i);
assert.match(request.prompt, /stable core identity/i);
assert.match(request.prompt, /facial structure/i);
assert.match(request.prompt, /skin tone/i);
assert.match(request.prompt, /distinctive traits/i);
assert.match(request.prompt, /not a generic default avatar/i);
assert.match(request.prompt, /do not invent a different face/i);

// Low-fidelity, real iPhone aesthetic leads the prompt
assert.match(request.prompt, /low-quality iPhone front-camera selfie/i);
assert.match(request.prompt, /not a clean studio portrait/i);
assert.match(request.prompt, /not a polished AI render/i);
assert.match(request.prompt, /sensor grain/i);
assert.match(request.prompt, /digital noise/i);
assert.match(request.prompt, /compression texture/i);
assert.match(request.prompt, /front-camera flatness/i);
assert.match(request.prompt, /lens vignette/i);

// Real, unretouched skin
assert.match(request.prompt, /real pores/i);
assert.match(request.prompt, /under-eye texture/i);
assert.match(request.prompt, /unfiltered face/i);
assert.match(request.prompt, /Instagram-story screenshot/i);
assert.match(request.prompt, /uneven or unflattering/i);
assert.match(request.prompt, /facial asymmetry/i);
assert.match(request.prompt, /no beauty-filter smoothing/i);
assert.match(request.prompt, /no airbrushing/i);
assert.match(request.prompt, /waxy plastic skin/i);
assert.match(request.prompt, /no glossy AI sheen/i);

// Explicit anti-AI guardrails
assert.match(request.prompt, /AI beauty-render look/i);
assert.match(request.prompt, /over-smoothed skin/i);
assert.match(request.prompt, /HDR over-sharpening/i);
assert.match(request.prompt, /perfectly symmetrical features/i);

// Tasteful appeal
assert.match(request.prompt, /tasteful sex appeal/i);
assert.match(request.prompt, /flirty/i);
assert.match(request.prompt, /feminine/i);
assert.match(request.prompt, /nude-glossy lips/i);
assert.match(request.prompt, /never explicit/i);
assert.match(request.prompt, /never oversexualized/i);

// Wardrobe variety
assert.match(request.prompt, /vary wardrobe and color/i);
assert.match(request.prompt, /mildly revealing/i);
assert.match(request.prompt, /crop tops/i);
assert.match(request.prompt, /off-shoulder/i);
assert.match(request.prompt, /different colors/i);
assert.match(request.prompt, /do not repeat the same white-cami look/i);

// Candid framing, real background, no studio
assert.match(request.prompt, /candid selfie framing/i);
assert.match(request.prompt, /mid-sentence/i);
assert.match(request.prompt, /lips slightly parted/i);
assert.match(request.prompt, /eyes toward the camera/i);
assert.match(request.prompt, /natural window light/i);
assert.match(request.prompt, /warm sunlight/i);
assert.match(request.prompt, /believable real-life background/i);
assert.match(request.prompt, /never a blank studio backdrop/i);
assert.match(request.prompt, /not a studio headshot/i);

// Single-image / anti-collage constraints
assert.match(request.prompt, /single person/i);
assert.match(request.prompt, /no collage/i);
assert.match(request.prompt, /no contact sheet/i);
assert.match(request.prompt, /no multi-panel/i);
assert.match(request.prompt, /exactly one person per image/i);

const avatarConcept = {
  avatar_concept: {
    goal: "Create a photorealistic fictional female UGC influencer avatar inspired by the reference aesthetic.",
    overall_vibe: "iPhone influencer baddie, girly pop, clean girl, confident, polished, relatable, modern social media creator",
  },
  output_settings: {
    aspect_ratio: "9:16",
    orientation: "vertical portrait",
  },
};

const conceptRequest = buildAvatarCandidateGenerationRequest({
  rawJson: JSON.stringify(avatarConcept),
  seedReferenceImageUrls: [
    "data:image/jpeg;base64,seed-one",
    "data:image/jpeg;base64,seed-two",
    "data:image/jpeg;base64,seed-three",
  ],
});

assert.equal(conceptRequest.numImages, 3);
assert.equal(conceptRequest.aspectRatio, "9:16");
assert.deepEqual(conceptRequest.referenceImageUrls, [
  "data:image/jpeg;base64,seed-one",
  "data:image/jpeg;base64,seed-two",
  "data:image/jpeg;base64,seed-three",
]);
assert.match(conceptRequest.prompt, /girly pop/);
assert.match(conceptRequest.prompt, /vertical portrait/);

assert.equal(getDefaultAvatarImportName('{"name":"Imported Creator"}'), "Imported Creator");
assert.equal(getDefaultAvatarImportName('{"displayName":"Display Creator"}'), "Display Creator");
assert.equal(getDefaultAvatarImportName("{bad json"), "Imported Avatar");

assert.deepEqual(
  appendAvatarCandidateSet(
    [
      {
        jobId: "first-job",
        candidates: [
          { fileId: "candidate-1" },
          { fileId: "candidate-2" },
          { fileId: "candidate-3" },
        ],
      },
    ],
    {
      jobId: "second-job",
      candidates: [
        { fileId: "candidate-4" },
        { fileId: "candidate-5" },
        { fileId: "candidate-6" },
      ],
    }
  ),
  [
    {
      jobId: "first-job",
      candidates: [
        { fileId: "candidate-1" },
        { fileId: "candidate-2" },
        { fileId: "candidate-3" },
      ],
    },
    {
      jobId: "second-job",
      candidates: [
        { fileId: "candidate-4" },
        { fileId: "candidate-5" },
        { fileId: "candidate-6" },
      ],
    },
  ]
);

const candidateReviewMarkup = renderToStaticMarkup(
  <AvatarImportPanel
    rawJson='{"name":"Imported Creator"}'
    avatarName="Edited Creator"
    seedReferenceImages={[{ name: "front.jpg", size: 1000, type: "image/jpeg" }]}
    candidateSets={[
      {
        jobId: "candidate-job",
        candidates: [
          { fileId: "candidate-1" },
          { fileId: "candidate-2" },
          { fileId: "candidate-3" },
        ],
      },
    ]}
    isGeneratingCandidates={false}
    generationError={null}
    onBack={() => {}}
    onAvatarNameChange={() => {}}
    onRawJsonChange={() => {}}
    onJsonFileChange={() => {}}
    onSeedReferenceImagesChange={() => {}}
    onRemoveSeedReferenceImage={() => {}}
    onGenerateCandidates={() => {}}
    onAcceptCandidate={() => {}}
  />
);

assert.match(candidateReviewMarkup, /Avatar Candidates/);
assert.match(candidateReviewMarkup, /Avatar name/);
assert.match(candidateReviewMarkup, /value="Edited Creator"/);
assert.match(candidateReviewMarkup, /Candidate 1/);
assert.match(candidateReviewMarkup, /Candidate 2/);
assert.match(candidateReviewMarkup, /Candidate 3/);
assert.match(candidateReviewMarkup, /Regenerate Candidates/);
assert.match(candidateReviewMarkup, /Use Candidate/);
assert.doesNotMatch(candidateReviewMarkup, /data-avatar-option=/);

const activeRegenerationMarkup = renderToStaticMarkup(
  <AvatarImportPanel
    rawJson='{"name":"Imported Creator"}'
    avatarName="Edited Creator"
    seedReferenceImages={[{ name: "front.jpg", size: 1000, type: "image/jpeg" }]}
    candidateSets={[
      {
        jobId: "candidate-job",
        candidates: [
          { fileId: "candidate-1" },
          { fileId: "candidate-2" },
          { fileId: "candidate-3" },
        ],
      },
    ]}
    isGeneratingCandidates
    generationError={null}
    onBack={() => {}}
    onAvatarNameChange={() => {}}
    onRawJsonChange={() => {}}
    onJsonFileChange={() => {}}
    onSeedReferenceImagesChange={() => {}}
    onRemoveSeedReferenceImage={() => {}}
    onGenerateCandidates={() => {}}
    onAcceptCandidate={() => {}}
  />
);

assert.match(activeRegenerationMarkup, /Generating another candidate set/);
assert.match(activeRegenerationMarkup, /Candidate 1/);
assert.match(activeRegenerationMarkup, /Candidate 2/);
assert.match(activeRegenerationMarkup, /Candidate 3/);
assert.match(activeRegenerationMarkup, /Use Candidate/);

assert.deepEqual(
  resetAvatarImportDraft(),
  {
    rawJson: "",
    seedReferenceImages: [],
    candidateSets: [],
    generationError: null,
  }
);
