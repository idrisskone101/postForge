import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { GalleryReviewStatusControl } from "../../src/components/gallery/review-status-control";
import { serializeOutputReviewStatus } from "../../src/lib/output-review-status";

const labels = (markup: string) => [...markup.matchAll(/<button[^>]*>(?:<[^>]+>)*([^<]+)/g)].map((match) => match[1]);

const waiting = renderToStaticMarkup(
  <GalleryReviewStatusControl outputId="out-1" reviewStatus={serializeOutputReviewStatus("needs_review")} />,
);
assert.deepEqual(labels(waiting), ["Needs review", "Approve", "Reject"], "idle segments read as the action they take");

const approved = renderToStaticMarkup(
  <GalleryReviewStatusControl outputId="out-1" reviewStatus={serializeOutputReviewStatus("approved_output")} />,
);
assert.deepEqual(labels(approved), ["Needs review", "Approved", "Reject"], "the current segment reads as the state");

console.log("Gallery review segments passed");
