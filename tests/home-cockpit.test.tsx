import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeCockpit } from "../src/app/home-cockpit";

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
        createdAt: now,
      },
    ]}
    recentJobs={[
      {
        id: "job-completed",
        prompt: "Cycle syncing creator reaction clip",
        type: "video",
        model: "kling-3.0-motion",
        status: "completed",
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
        createdAt: now,
      },
      {
        id: "job-completed-3",
        prompt: "Third creator reaction clip",
        type: "video",
        model: "kling-3.0-motion",
        status: "completed",
        createdAt: now,
      },
      {
        id: "job-completed-4",
        prompt: "Fourth creator reaction clip",
        type: "video",
        model: "kling-3.0-motion",
        status: "completed",
        createdAt: now,
      },
    ]}
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
  />
);

assert.match(markup, /Daily Production Loop/);
assert.match(markup, /Continue latest Clone/);
assert.match(markup, /Review new Outputs/);
assert.match(markup, /Inspect active jobs/);
assert.match(markup, /Return to Inspiration/);
assert.match(markup, /Compact Spend/);
assert.match(markup, /job-processing/);
assert.match(markup, /job-completed/);
assert.match(markup, /Open Gallery/);
assert.match(markup, /data-home-pending-review-scroll="true"/);
assert.match(markup, /job-completed-4/);

assert.match(emptyMarkup, /data-workspace-state="empty"/);
assert.match(emptyMarkup, /Start today&#x27;s Daily Production Loop/);
assert.match(emptyMarkup, /Return to Inspiration/);
assert.match(emptyMarkup, /Start Clone/);
