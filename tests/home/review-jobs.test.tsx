import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeCockpit } from "../../src/app/(app)/home-cockpit";
import { toReviewItems } from "../../src/app/(app)/home-format";
import type { HomeJob } from "../../src/app/(app)/home-types";

const now = new Date("2026-06-14T18:00:00Z");
const fortyMinutesAgo = new Date(now.getTime() - 40 * 60_000);
const emptyCosts = {
  period: "today",
  totalCost: 0,
  breakdown: { image: { count: 0, cost: 0 }, video: { count: 0, cost: 0 } },
  byModel: {},
};

const cloneJob: HomeJob = {
  id: "completed-clone-video",
  prompt: "@Element1 Person performing the actions from the reference video",
  type: "video",
  model: "kling-3.0-motion",
  status: "completed",
  tags: ["ugc-clone"],
  createdAt: now,
  productionContext: { sourceDetail: "Saved creator clip", identityDetail: "Avery Chen" },
  output: { id: "output-video", createdAt: fortyMinutesAgo },
};

const markup = renderToStaticMarkup(
  <HomeCockpit
    dashboard={{
      todaySummary: emptyCosts,
      activeJobs: [],
      recentJobs: [
        cloneJob,
        { ...cloneJob, output: { id: "output-video-2", createdAt: fortyMinutesAgo } },
      ],
      completedThisWeek: 1,
      pendingReviewCount: 2,
      recentMedia: [],
      now,
    }}
  />
);

// Completed clone outputs surface in the review queue with clone deep links
assert.match(markup, /Review queue/);
assert.match(markup, /href="\/ugc-clone\/completed-clone-video"/);
assert.match(markup, /Person performing the actions from the reference video/);
assert.match(markup, /aria-label="Approve output"/);
assert.match(markup, /aria-label="Reject output"/);
assert.doesNotMatch(markup, /href="\/generate\/completed-clone-video"/);

// One job with two outputs is two rows, each with its own output id (the row key)
assert.equal(markup.match(/aria-label="Approve output"/g)?.length, 2);
assert.deepEqual(
  toReviewItems([cloneJob, { ...cloneJob, output: { id: "output-video-2" } }], now).map(
    (item) => item.outputId
  ),
  ["output-video", "output-video-2"]
);

// Row meta is identity and the output's age
assert.deepEqual(
  toReviewItems([cloneJob], now).map((item) => [item.outputId, item.meta, item.mediaType]),
  [["output-video", "Video - Avery Chen - 40 min ago", "video"]]
);
// Without an identity the model's display name stands in
assert.equal(
  toReviewItems([{ ...cloneJob, productionContext: undefined }], now)[0]?.meta,
  "Video - Kling 3.0 Motion Control - 40 min ago"
);
// Jobs without an output are not reviewable rows
assert.deepEqual(toReviewItems([{ ...cloneJob, output: null }], now), []);
