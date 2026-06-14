import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeCockpit } from "../src/app/home-cockpit";

const now = new Date("2026-06-14T18:00:00Z");

const markup = renderToStaticMarkup(
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
        video: { count: 3, cost: 0 },
      },
      byModel: {},
    }}
    activeJobs={[]}
    recentJobs={[
      {
        id: "completed-clone-video",
        prompt: "@Element1 Person performing the actions from the reference video",
        type: "video",
        model: "kling-3.0-motion",
        status: "completed",
        createdAt: now,
        output: {
          id: "output-video",
          width: 1080,
          height: 1920,
          durationSec: 12,
        },
      },
    ]}
  />
);

assert.match(markup, /Pending review/);
assert.match(markup, /Clone output ready/);
assert.match(markup, /completed-clone-video/);
assert.doesNotMatch(markup, /Generated asset ready/);
