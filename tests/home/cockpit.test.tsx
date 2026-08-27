import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeCockpit } from "../../src/app/(app)/home-cockpit";
import { getHomeJobProductionMetadata } from "../../src/lib/jobs/home-production-context";

const now = new Date("2026-06-12T15:00:00Z");

const emptyCosts = {
  period: "today",
  totalCost: 0,
  breakdown: {
    image: { count: 0, cost: 0 },
    video: { count: 0, cost: 0 },
  },
  byModel: {},
};

const markup = renderToStaticMarkup(
  <HomeCockpit
    dashboard={{
      todaySummary: {
        period: "today",
        totalCost: 1.28,
        breakdown: {
          image: { count: 2, cost: 0.18 },
          video: { count: 1, cost: 1.1 },
        },
        byModel: {},
      },
      activeJobs: [
        {
          id: "job-processing",
          prompt: "Clone the creator hook with a new first frame",
          type: "video",
          model: "kling-3.0-motion",
          status: "processing",
          tags: ["ugc-clone"],
          createdAt: now,
          productionContext: {
            sourceDetail: "Creator launch clip",
            identityDetail: "Avery Chen",
          },
        },
      ],
      recentJobs: [
        {
          id: "job-completed",
          prompt: "Cycle syncing creator reaction clip",
          type: "video",
          model: "kling-3.0-motion",
          status: "completed",
          tags: ["ugc-clone"],
          createdAt: now,
          output: {
            id: "output-1",
            width: 1080,
            height: 1920,
            durationSec: 12,
          },
        },
        {
          id: "job-completed-2",
          prompt: "Second creator reaction clip",
          type: "video",
          model: "kling-3.0-motion",
          status: "completed",
          tags: ["ugc-clone"],
          createdAt: now,
        },
        {
          id: "job-completed-3",
          prompt: "Third creator reaction clip",
          type: "video",
          model: "kling-3.0-motion",
          status: "completed",
          tags: ["ugc-clone"],
          createdAt: now,
        },
        {
          id: "job-completed-4",
          prompt: "Fourth creator reaction clip",
          type: "video",
          model: "kling-3.0-motion",
          status: "completed",
          tags: ["ugc-clone"],
          createdAt: now,
        },
        {
          id: "job-completed-5",
          prompt: "Fifth creator reaction clip",
          type: "video",
          model: "kling-3.0-motion",
          status: "completed",
          tags: ["ugc-clone"],
          createdAt: now,
        },
      ],
      completedThisWeek: 7,
      pendingReviewCount: 1286,
      recentMedia: [
        {
          id: "media-1",
          jobId: "job-completed",
          type: "image",
          jobType: "image",
          reviewStatus: "approved_output",
          model: "nano-banana-2",
          prompt: "Gradient landscape study",
          isClone: false,
        },
        {
          id: "media-2",
          jobId: "job-completed-2",
          type: "video",
          jobType: "video",
          durationSec: 12,
          reviewStatus: "needs_review",
          model: "kling-3.0-motion",
          prompt: "Creator reaction take two",
          isClone: true,
        },
      ],
      now,
    }}
  />
);

const emptyMarkup = renderToStaticMarkup(
  <HomeCockpit
    dashboard={{
      todaySummary: emptyCosts,
      activeJobs: [],
      recentJobs: [],
      completedThisWeek: 0,
      pendingReviewCount: 0,
      recentMedia: [],
      now,
    }}
  />
);

const ordinaryGenerateJob = {
  id: "ordinary-generate",
  prompt: "@not-proof Create a product still",
  type: "image",
  model: "nano-banana-2",
  status: "processing",
  tags: [],
  createdAt: now,
};
const ordinaryMarkup = renderToStaticMarkup(
  <HomeCockpit
    dashboard={{
      todaySummary: emptyCosts,
      activeJobs: [ordinaryGenerateJob],
      recentJobs: [],
      completedThisWeek: 0,
      pendingReviewCount: 0,
      recentMedia: [],
      now,
    }}
  />
);

// Header and primary action
assert.match(markup, /data-home-title="Home"/);
assert.match(markup, />Home</);
assert.match(markup, /New Clone/);
assert.match(markup, /pf-button-primary/);

// Stat strip: four canon stat cards with real values
assert.match(markup, /min-\[860px\]:!grid-cols-4/);
assert.match(markup, /Spend today/);
assert.match(markup, /Jobs running/);
assert.match(markup, /Awaiting review/);
assert.match(markup, /Completed this week/);
assert.match(markup, /\$1\.28/);
assert.match(markup, />7</);

// Section structure
assert.match(markup, /Review queue/);
assert.match(markup, /Recent media/);
assert.match(markup, /In progress/);
assert.match(markup, /Start new work/);
assert.match(markup, /Review all/);
assert.match(markup, /View all/);

// Clone-aware deep links preserved
assert.match(markup, /href="\/ugc-clone\/job-processing"/);
assert.match(markup, /href="\/ugc-clone\/job-completed"/);

// Review queue caps at four rows
assert.match(markup, /job-completed-4/);
assert.doesNotMatch(markup, /job-completed-5/);

// Inline review controls are real buttons wired to outputs
assert.match(markup, /aria-label="Approve output"/);
assert.match(markup, /aria-label="Reject output"/);

// Production context still surfaces in active job rows
assert.match(markup, /Avery Chen/);

// Recent media badges map real review states
assert.match(markup, /Approved/);
assert.match(markup, /In review/);
assert.match(markup, /href="\/generate\/job-completed"/);
assert.match(markup, /href="\/ugc-clone\/job-completed-2"/);
assert.match(markup, /Gradient landscape study/);

// Start actions preserved
assert.match(markup, /Browse inspiration/);
assert.match(markup, /Start a clone/);
assert.match(markup, /Generate an asset/);

// Ordinary generate jobs deep-link to the generate route
assert.match(ordinaryMarkup, /href="\/generate\/ordinary-generate"/);
assert.match(ordinaryMarkup, /Create a product still/);

// Production metadata helper contract unchanged
assert.deepEqual(getHomeJobProductionMetadata({}), {
  sourceId: null,
  sourceDetail: null,
  identityId: null,
  referenceCount: 0,
});
assert.deepEqual(
  getHomeJobProductionMetadata({
    tiktokSourceId: "source-1",
    avatarId: "avatar-1",
    sourceVideo: { sourceId: "source-1", label: "Saved source clip" },
  }),
  {
    sourceId: "source-1",
    sourceDetail: "Saved source clip",
    identityId: "avatar-1",
    referenceCount: 0,
  }
);
assert.equal(
  getHomeJobProductionMetadata({ referenceFileIds: ["file-1", "file-2"] })
    .sourceDetail,
  "2 saved references"
);

// Empty workspace: stats render and the empty stage invites the loop
assert.match(emptyMarkup, /data-workspace-state="empty"/);
assert.match(emptyMarkup, /Start today&#x27;s production loop/);
assert.match(emptyMarkup, /Return to Inspiration/);
assert.match(emptyMarkup, /Start Clone/);
assert.match(emptyMarkup, /Completed this week/);

// The Awaiting review stat is the true pending count, never the capped row count
assert.match(markup, /Awaiting review/);
assert.match(markup, />1286</);
