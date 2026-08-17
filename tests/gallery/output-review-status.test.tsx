import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { OutputReviewStatusControl } from "../src/components/output-review-status-control";
import {
  OUTPUT_REVIEW_STATUSES,
  normalizeOutputReviewStatus,
  serializeOutputReviewStatus,
  updateOutputReviewStatus,
} from "../src/lib/output-review-status";

assert.deepEqual(
  OUTPUT_REVIEW_STATUSES.map((status) => status.label),
  ["Needs Review", "Approved Output", "Rejected Output"]
);

assert.equal(normalizeOutputReviewStatus(null), "needs_review");
assert.equal(normalizeOutputReviewStatus(""), "needs_review");
assert.equal(normalizeOutputReviewStatus("approved"), "needs_review");
assert.equal(normalizeOutputReviewStatus("approved_output"), "approved_output");
assert.equal(normalizeOutputReviewStatus("rejected_output"), "rejected_output");

assert.deepEqual(serializeOutputReviewStatus(null), {
  value: "needs_review",
  label: "Needs Review",
  tone: "neutral",
});

void (async () => {
  const updates: Array<{ outputId: string; reviewStatus: string }> = [];

  const approved = await updateOutputReviewStatus({
    outputId: "file-1",
    reviewStatus: "approved_output",
    update: async (outputId, reviewStatus) => {
      updates.push({ outputId, reviewStatus });
      return { id: outputId, reviewStatus };
    },
  });

  assert.deepEqual(updates, [
    { outputId: "file-1", reviewStatus: "approved_output" },
  ]);
  assert.deepEqual(approved, {
    id: "file-1",
    reviewStatus: {
      value: "approved_output",
      label: "Approved Output",
      tone: "approved",
    },
  });

  await assert.rejects(
    () =>
      updateOutputReviewStatus({
        outputId: "file-1",
        reviewStatus: "video",
        update: async (outputId, reviewStatus) => ({ id: outputId, reviewStatus }),
      }),
    /Invalid output review status/
  );
})();

const reviewControlMarkup = renderToStaticMarkup(
  <OutputReviewStatusControl
    outputId="file-1"
    reviewStatus={{
      value: "approved_output",
      label: "Approved Output",
      tone: "approved",
    }}
  />
);

assert.match(reviewControlMarkup, /Needs Review/);
assert.match(reviewControlMarkup, /Mark as Needs Review/);
assert.match(reviewControlMarkup, /Mark as Approved Output/);
assert.match(reviewControlMarkup, /Mark as Rejected Output/);
assert.match(reviewControlMarkup, /aria-pressed="true"/);

const compactReviewControlMarkup = renderToStaticMarkup(
  <OutputReviewStatusControl
    outputId="file-1"
    compact
    reviewStatus={{
      value: "approved_output",
      label: "Approved Output",
      tone: "approved",
    }}
  />
);

assert.doesNotMatch(compactReviewControlMarkup, />Approved</);
assert.match(compactReviewControlMarkup, /Output review status: Approved Output/);
assert.match(compactReviewControlMarkup, /Mark as Approved Output/);
assert.match(compactReviewControlMarkup, /size-8 rounded-lg/);
