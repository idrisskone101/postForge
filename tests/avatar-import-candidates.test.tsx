import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  appendAvatarCandidateSet,
  AvatarImportPanel,
  buildAvatarCandidateGenerationRequest,
  resetAvatarImportDraft,
} from "../src/components/avatar-picker";

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
assert.match(request.prompt, /clean portrait source images/i);
assert.match(request.prompt, /stable core identity/i);
assert.match(request.prompt, /simple varied backgrounds/i);
assert.match(request.prompt, /no bedroom/i);
assert.match(request.prompt, /no lifestyle/i);

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
    onRawJsonChange={() => {}}
    onJsonFileChange={() => {}}
    onSeedReferenceImagesChange={() => {}}
    onRemoveSeedReferenceImage={() => {}}
    onGenerateCandidates={() => {}}
    onAcceptCandidate={() => {}}
  />
);

assert.match(candidateReviewMarkup, /Avatar Candidates/);
assert.match(candidateReviewMarkup, /Candidate 1/);
assert.match(candidateReviewMarkup, /Candidate 2/);
assert.match(candidateReviewMarkup, /Candidate 3/);
assert.match(candidateReviewMarkup, /Regenerate Candidates/);
assert.match(candidateReviewMarkup, /Use Candidate/);
assert.doesNotMatch(candidateReviewMarkup, /data-avatar-option=/);

assert.deepEqual(
  resetAvatarImportDraft(),
  {
    rawJson: "",
    seedReferenceImages: [],
    candidateSets: [],
    generationError: null,
  }
);
