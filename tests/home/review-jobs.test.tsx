import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeCockpit } from "../../src/app/home-cockpit";

const now = new Date("2026-06-14T18:00:00Z");

const markup = renderToStaticMarkup(
  <HomeCockpit
    dashboard={{
      todaySummary: {
        period: "today",
        totalCost: 0,
        breakdown: {
          image: { count: 0, cost: 0 },
          video: { count: 0, cost: 0 },
        },
        byModel: {},
      },
      monthSummary: {
        period: "month",
        totalCost: 0,
        breakdown: {
          image: { count: 0, cost: 0 },
          video: { count: 3, cost: 0 },
        },
        byModel: {},
      },
      activeJobs: [],
      recentJobs: [
        {
          id: "completed-clone-video",
          prompt: "@Element1 Person performing the actions from the reference video",
          type: "video",
          model: "kling-3.0-motion",
          status: "completed",
          tags: ["ugc-clone"],
          createdAt: now,
          productionContext: {
            sourceDetail: "Saved creator clip",
            identityDetail: "Avery Chen",
          },
          output: {
            id: "output-video",
            width: 1080,
            height: 1920,
            durationSec: 12,
          },
        },
      ],
      completedThisWeek: 1,
      pendingReviewCount: 1,
      recentMedia: [],
      now,
    }}
  />
);

// Completed clone outputs surface in the review queue with clone deep links
assert.match(markup, /Review queue/);
assert.match(markup, /completed-clone-video/);
assert.match(markup, /href="\/ugc-clone\/completed-clone-video"/);
assert.match(markup, /Person performing the actions from the reference video/);
assert.match(markup, /aria-label="Approve output"/);
assert.match(markup, /aria-label="Reject output"/);
assert.doesNotMatch(markup, /href="\/generate\/completed-clone-video"/);
