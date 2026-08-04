import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getHomeProductionSteps,
  HomeCockpit,
} from "../src/app/home-cockpit";
import { getHomeJobProductionMetadata } from "../src/lib/jobs/home-production-context";

const now = new Date("2026-06-12T15:00:00Z");

const markup = renderToStaticMarkup(
  <HomeCockpit
    todaySummary={{
      period: "today",
      totalCost: 1.28,
      breakdown: {
        image: { count: 2, cost: 0.18 },
        video: { count: 1, cost: 1.1 },
      },
      byModel: {},
    }}
    monthSummary={{
      period: "month",
      totalCost: 18.42,
      breakdown: {
        image: { count: 14, cost: 2.12 },
        video: { count: 8, cost: 16.3 },
      },
      byModel: {},
    }}
    activeJobs={[
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
    ]}
    recentJobs={[
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
    ]}
    now={now}
  />
);
const emptyMarkup = renderToStaticMarkup(
  <HomeCockpit
    todaySummary={{
      period: "today",
      totalCost: 0,
      breakdown: {
        image: { count: 0, cost: 0 },
        video: { count: 0, cost: 0 },
      },
      byModel: {},
    }}
    monthSummary={{
      period: "month",
      totalCost: 0,
      breakdown: {
        image: { count: 0, cost: 0 },
        video: { count: 0, cost: 0 },
      },
      byModel: {},
    }}
    activeJobs={[]}
    recentJobs={[]}
    now={now}
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
    todaySummary={{
      period: "today",
      totalCost: 0,
      breakdown: {
        image: { count: 0, cost: 0 },
        video: { count: 0, cost: 0 },
      },
      byModel: {},
    }}
    monthSummary={{
      period: "month",
      totalCost: 0,
      breakdown: {
        image: { count: 0, cost: 0 },
        video: { count: 0, cost: 0 },
      },
      byModel: {},
    }}
    activeJobs={[ordinaryGenerateJob]}
    recentJobs={[]}
    now={now}
  />
);

assert.match(markup, /Daily production cockpit/);
assert.match(markup, /data-home-production-status="true"/);
assert.match(markup, /1 in progress/);
assert.match(markup, /4 to review/);
assert.match(markup, /In progress/);
assert.match(markup, /Needs review/);
assert.match(markup, /Start new work/);
assert.match(markup, /Spend today/);
assert.match(markup, /Awaiting review/);
assert.match(markup, /Started today/);
assert.match(markup, /href="\/ugc-clone\/job-processing"/);
assert.match(markup, /href="\/ugc-clone\/job-completed"/);
assert.match(markup, /Review all/);
assert.match(markup, /View all/);
assert.match(markup, /data-home-pending-review-grid="true"/);
assert.doesNotMatch(markup, /job-completed-4/);
assert.match(markup, /Avery Chen/);
assert.match(markup, /Today&#x27;s spend mix by generation type/);
assert.match(markup, /jobs started since midnight/);
assert.match(markup, /4 visible outputs awaiting a decision/);
assert.match(markup, /1 job moving through the queue/);
assert.match(markup, /Browse inspiration/);
assert.match(markup, /Start a clone/);
assert.match(markup, /Generate an asset/);
assert.doesNotMatch(markup, /Inspiration ready/);
assert.doesNotMatch(markup, /active or complete/);

assert.equal(getHomeProductionSteps(ordinaryGenerateJob)[0].complete, false);
assert.equal(getHomeProductionSteps(ordinaryGenerateJob)[1].complete, false);
assert.doesNotMatch(ordinaryMarkup, /Current identity/);
assert.doesNotMatch(ordinaryMarkup, />Selected</);
assert.doesNotMatch(ordinaryMarkup, /source and production setup are saved/i);
assert.match(ordinaryMarkup, /No tracked generation spend today/);
assert.match(ordinaryMarkup, /Create a product still/);

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

assert.match(emptyMarkup, /data-workspace-state="empty"/);
assert.match(emptyMarkup, /Start today&#x27;s Daily Production Loop/);
assert.match(emptyMarkup, /Return to Inspiration/);
assert.match(emptyMarkup, /Start Clone/);
assert.match(emptyMarkup, /No tracked generation spend today/);
assert.match(emptyMarkup, /queue is clear/);
assert.match(emptyMarkup, /nothing to decide/);
