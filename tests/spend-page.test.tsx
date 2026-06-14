import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { SpendPageContent } from "../src/app/costs/costs-page-client";

const markup = renderToStaticMarkup(
  <TooltipProvider>
    <SpendPageContent
      totalCost={12.75}
      currentPeriodCost={4.82}
      changePercent={-12}
      avgCycleCost={0.24}
      totalJobs={20}
      topModel={{ name: "kling-3.0-motion", cost: 8.5, pct: "67" }}
      chartData={[
        { date: "Jun 12", image: 0.32, video: 1.2 },
        { date: "Jun 13", image: 0.42, video: 2.88 },
      ]}
      byModel={{
        "kling-3.0-motion": { count: 12, cost: 8.5 },
        "flux-pro": { count: 8, cost: 4.25 },
      }}
      breakdown={{
        image: { count: 8, cost: 1.25 },
        video: { count: 12, cost: 11.5 },
      }}
      logs={[
        {
          id: "log-1",
          jobId: "job-1",
          model: "kling-3.0-motion",
          type: "video",
          amount: 1.2,
          createdAt: "2026-06-12T12:00:00.000Z",
        },
      ]}
      period="30d"
      onPeriodChange={() => {}}
    />
  </TooltipProvider>
);
const emptyMarkup = renderToStaticMarkup(
  <TooltipProvider>
    <SpendPageContent
      totalCost={0}
      currentPeriodCost={0}
      changePercent={0}
      avgCycleCost={0}
      totalJobs={0}
      topModel={null}
      chartData={[]}
      byModel={{}}
      breakdown={{
        image: { count: 0, cost: 0 },
        video: { count: 0, cost: 0 },
      }}
      logs={[]}
      period="30d"
      onPeriodChange={() => {}}
    />
  </TooltipProvider>
);

assert.match(markup, /Spend/);
assert.match(markup, /Cost tracking, budget signals, and model usage/);
assert.match(markup, /7D/);
assert.match(markup, /30D/);
assert.match(markup, /90D/);
assert.match(markup, /Export CSV/);
assert.match(markup, /Period Spend/);
assert.match(markup, /Spend by Format/);
assert.match(markup, /Spend by Model/);
assert.match(markup, /Cost Log/);
assert.match(markup, /kling-3\.0-motion/);
assert.match(markup, /flux-pro/);
assert.doesNotMatch(markup, /Analytics/);
assert.doesNotMatch(markup, /Recent Activity/);

assert.match(emptyMarkup, /data-workspace-state="empty"/);
assert.match(emptyMarkup, /No model spend yet/);
assert.match(emptyMarkup, /No cost log entries yet/);
assert.match(emptyMarkup, /Start Clone/);
assert.match(emptyMarkup, /Open Generate/);
