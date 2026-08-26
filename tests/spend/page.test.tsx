import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { TooltipProvider } from "../../src/components/ui/tooltip";
import { SpendPageContent } from "../../src/app/(app)/costs/spend-page-content";
import type {
  CostsPageClientProps,
  SpendPageHandlers,
} from "../../src/app/(app)/costs/types";

const handlers: SpendPageHandlers = {
  onPeriodChange: () => {},
  onLogPageChange: () => {},
  onSearchChange: () => {},
  onModelChange: () => {},
  onClearFilters: () => {},
  onExportCsv: async () => 0,
};

const populatedDashboard: CostsPageClientProps = {
  totalCost: 12.75,
  currentPeriodCost: 4.82,
  changePercent: -12,
  avgCycleCost: 0.24,
  totalJobs: 20,
  topModel: { name: "kling-3.0-motion", cost: 8.5, pct: "67" },
  chartData: [
    { date: "Jun 12", image: 0.32, video: 1.2 },
    { date: "Jun 13", image: 0.42, video: 2.88 },
  ],
  byModel: {
    "kling-3.0-motion": { count: 12, cost: 8.5 },
    "flux-pro": { count: 8, cost: 4.25 },
  },
  breakdown: {
    image: { count: 8, cost: 1.25 },
    video: { count: 12, cost: 11.5 },
  },
  logs: [
    {
      id: "log-1",
      jobId: "job-1",
      model: "kling-3.0-motion",
      type: "video",
      amount: 1.2,
      createdAt: "2026-06-12T12:00:00.000Z",
    },
  ],
  logPage: 0,
  logTotalCount: 1,
  logHasNext: false,
  logFilterActive: false,
  search: "",
  model: null,
  period: "30d",
};

const emptyDashboard: CostsPageClientProps = {
  ...populatedDashboard,
  totalCost: 0,
  currentPeriodCost: 0,
  changePercent: 0,
  avgCycleCost: 0,
  totalJobs: 0,
  topModel: null,
  chartData: [],
  byModel: {},
  breakdown: {
    image: { count: 0, cost: 0 },
    video: { count: 0, cost: 0 },
  },
  logs: [],
  logTotalCount: 0,
};

const matchingEmptyDashboard: CostsPageClientProps = {
  ...populatedDashboard,
  totalCost: 4.82,
  currentPeriodCost: 4.82,
  changePercent: 0,
  avgCycleCost: 0.24,
  totalJobs: 20,
  topModel: { name: "flux-pro", cost: 4.82, pct: "100" },
  chartData: [{ date: "Jun 12", image: 0.32, video: 1.2 }],
  byModel: { "flux-pro": { count: 20, cost: 4.82 } },
  breakdown: {
    image: { count: 20, cost: 4.82 },
    video: { count: 0, cost: 0 },
  },
  logs: [],
  logTotalCount: 0,
  logFilterActive: true,
  search: "missing-job",
};

const markup = renderToStaticMarkup(
  <TooltipProvider>
    <SpendPageContent dashboard={populatedDashboard} handlers={handlers} />
  </TooltipProvider>
);
const emptyMarkup = renderToStaticMarkup(
  <TooltipProvider>
    <SpendPageContent dashboard={emptyDashboard} handlers={handlers} />
  </TooltipProvider>
);
const matchingEmptyMarkup = renderToStaticMarkup(
  <TooltipProvider>
    <SpendPageContent dashboard={matchingEmptyDashboard} handlers={handlers} />
  </TooltipProvider>
);

assert.match(markup, /Spend/);
assert.match(markup, /Cost tracking, budget signals, and model usage/);
assert.match(markup, /7D/);
assert.match(markup, /30D/);
assert.match(markup, /90D/);
assert.match(markup, /Export CSV/);
assert.match(markup, /Period Spend/);
assert.match(markup, /Generations/);
assert.match(markup, /Avg cost/);
assert.match(markup, /Top Model/);
assert.match(markup, /Budget remaining/);
assert.match(markup, /Edit budget/);
assert.match(markup, /Spend by Format/);
assert.match(markup, /Spend by Model/);
assert.match(markup, /Spend Over Time/);
assert.match(markup, /Spend breakdown/);
assert.match(markup, /Workflow type spend distribution/);
assert.match(markup, /Generation Log/);
assert.match(markup, /data-spend-analysis-grid="true"/);
assert.match(markup, /xl:grid-cols-\[minmax\(0,1fr\)_340px\]/);
assert.match(markup, /Search generations/);
assert.match(markup, /kling-3\.0-motion/);
assert.match(markup, /flux-pro/);
assert.doesNotMatch(markup, /Analytics/);
assert.doesNotMatch(markup, /Recent Activity/);
assert.doesNotMatch(markup, /Model Distribution/);
assert.ok(markup.indexOf("Period Spend") < markup.indexOf("Budget remaining"));
assert.ok(markup.indexOf("Budget remaining") < markup.indexOf("Spend Over Time"));
assert.ok(markup.indexOf("Spend Over Time") < markup.indexOf("Spend by Format"));
assert.ok(markup.indexOf("Spend by Model") < markup.indexOf("Generation Log"));

assert.match(emptyMarkup, /data-workspace-state="empty"/);
assert.match(emptyMarkup, /data-spend-empty="true"/);
assert.match(emptyMarkup, /data-spend-chart="empty"/);
assert.match(emptyMarkup, /No spend data yet/);
assert.match(emptyMarkup, /No cost log entries yet/);
assert.match(emptyMarkup, /Start Clone/);
assert.match(emptyMarkup, /Open Generate/);
assert.doesNotMatch(emptyMarkup, /No matching cost log entries/);

assert.match(matchingEmptyMarkup, /No matching cost log entries/);
assert.match(matchingEmptyMarkup, /Clear filters/);
assert.match(matchingEmptyMarkup, /missing-job/);
assert.doesNotMatch(matchingEmptyMarkup, /No cost log entries yet/);
assert.doesNotMatch(matchingEmptyMarkup, /Start Clone/);

assert.match(markup, /grid grid-cols-2 gap-3 xl:grid-cols-4/);

const pagedLogs = Array.from({ length: 10 }, (_, index) => ({
  id: `log-${index}`,
  jobId: `job-${index}`,
  model: "flux-pro",
  type: "image" as const,
  amount: 0.25,
  createdAt: "2026-06-12T12:00:00.000Z",
}));
const pagedMarkup = renderToStaticMarkup(
  <TooltipProvider>
    <SpendPageContent
      dashboard={{
        ...matchingEmptyDashboard,
        totalCost: 12.75,
        changePercent: -12,
        totalJobs: 25,
        byModel: { "flux-pro": { count: 25, cost: 4.82 } },
        breakdown: {
          image: { count: 25, cost: 4.82 },
          video: { count: 0, cost: 0 },
        },
        logs: pagedLogs,
        logTotalCount: 25,
        logHasNext: true,
        search: "flux",
        model: "flux-pro",
      }}
      handlers={handlers}
    />
  </TooltipProvider>
);
assert.match(pagedMarkup, /25 entries/);
assert.match(pagedMarkup, /Page/);
assert.match(pagedMarkup, /of 3/);
assert.match(pagedMarkup, /aria-label="Next cost log page"/);
assert.match(pagedMarkup, /aria-label="Previous cost log page"/);
assert.match(pagedMarkup, /value="flux"/);
assert.match(pagedMarkup, /value="flux-pro"/);
