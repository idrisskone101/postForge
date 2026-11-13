import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeCockpit } from "../../src/app/(app)/home-cockpit";
import { HomeGlanceStats } from "../../src/app/(app)/home-glance-stats";
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
          output: { id: "output-2" },
        },
        {
          id: "job-completed-3",
          prompt: "Third creator reaction clip",
          type: "video",
          model: "kling-3.0-motion",
          status: "completed",
          tags: ["ugc-clone"],
          createdAt: now,
          output: { id: "output-3" },
        },
        {
          id: "job-completed-4",
          prompt: "Fourth creator reaction clip",
          type: "video",
          model: "kling-3.0-motion",
          status: "completed",
          tags: ["ugc-clone"],
          createdAt: now,
          output: { id: "output-4" },
        },
        {
          id: "job-completed-5",
          prompt: "Fifth creator reaction clip",
          type: "video",
          model: "kling-3.0-motion",
          status: "completed",
          tags: ["ugc-clone"],
          createdAt: now,
          output: { id: "output-5" },
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

// Stat strip: four stats with real values, no heading, each a deep link
assert.match(markup, /aria-label="Today at a glance"/);
assert.doesNotMatch(markup, /<h2[^>]*>Today at a glance/);
assert.match(markup, /Jobs running/);
assert.match(markup, /Awaiting review/);
assert.match(markup, /Completed this week/);
assert.match(markup, /Spend today/);
assert.match(markup, /\$1\.28/);
assert.match(markup, />7</);
assert.match(markup, /href="\/jobs\?status=active"/);
assert.match(markup, /href="\/costs"/);

// No header controls or start tiles: the sidebar offers those routes
assert.doesNotMatch(markup, /New clone/i);
assert.doesNotMatch(markup, /Start new work/);
assert.doesNotMatch(markup, /Browse inspiration/);

// Section structure and panel deep links
assert.match(markup, /Review queue/);
assert.match(markup, /Recent media/);
assert.match(markup, /In progress/);
assert.match(markup, /href="\/gallery\?reviewStatus=needs_review"[^>]*>Review all/);
assert.match(markup, /href="\/gallery"[^>]*>View all/);

// Clone-aware deep links preserved
assert.match(markup, /href="\/ugc-clone\/job-processing"/);
assert.match(markup, /href="\/ugc-clone\/job-completed"/);

// Review queue shows outputs only (one row per output) and caps at two rows
assert.match(markup, /src="\/api\/files\/output-1"|aria-label="Output preview"/);
assert.match(markup, /href="\/ugc-clone\/job-completed-2"/);
assert.doesNotMatch(markup, /job-completed-3/);

// Inline review controls are real buttons wired to outputs
assert.match(markup, /aria-label="Approve output"/);
assert.match(markup, /aria-label="Reject output"/);

// Review rows carry identity and age, no status chip
assert.match(markup, /Avery Chen - just now|kling-3.0-motion - just now|Kling[^<]* - just now/);

// In progress: running job shows its stage in ember with one continuous stage bar
assert.match(markup, /Generating|Processing|Preparing/);
assert.match(markup, /role="progressbar" aria-label="[^"]*stage \d of 3"/);
assert.match(markup, /data-running="true"><span class="wb-meter-fill" style="transform:scaleX\(0\.\d+\)"/, "one continuous bar filled to stage over total");

// Recent media status words are round icon badges that map real review states
assert.match(markup, /class="wb-status-badge[^"]*" data-tone="ok"/);
assert.match(markup, /aria-label="Approved"/);
assert.match(markup, /aria-label="Needs review"/);
assert.match(markup, /href="\/generate\/job-completed"/);
assert.match(markup, /href="\/ugc-clone\/job-completed-2"/);
assert.match(markup, /Gradient landscape study/);

// Ordinary generate jobs deep-link to the generate route
assert.match(ordinaryMarkup, /href="\/generate\/ordinary-generate"/);
assert.match(ordinaryMarkup, /Create a product still/);
assert.match(ordinaryMarkup, />Processing</);

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

// Empty workspace: stats render and each panel has its own empty state
assert.match(emptyMarkup, /Nothing to review/);
assert.match(emptyMarkup, /Nothing in progress/);
assert.match(emptyMarkup, /No media yet/);
assert.match(emptyMarkup, /href="\/ugc-clone"[^>]*>Start a clone/);
assert.match(emptyMarkup, /Completed this week/);

// The Awaiting review stat is the true pending count, never the capped row count
assert.match(markup, /Awaiting review/);
assert.match(markup, />1286</);

// A stat with nothing to add under it has no foot line: no lone dash and never a zero
assert.doesNotMatch(emptyMarkup, /wb-stat-foot/);

// Spend shows the month against the browser-stored budget; the server renders the default budget
const spendMarkup = renderToStaticMarkup(
  <HomeGlanceStats
    dashboard={{
      todaySummary: emptyCosts,
      monthSpend: 38.2,
      activeJobs: [],
      recentJobs: [],
      completedThisWeek: 0,
      pendingReviewCount: 0,
      recentMedia: [],
      now,
    }}
  />
);
assert.match(spendMarkup, /role="progressbar"[^>]*aria-valuenow="15"/);
assert.match(spendMarkup, /\$38\.20 \/ \$250/);
