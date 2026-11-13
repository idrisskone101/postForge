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

assert.match(markup, />Spend</);
assert.match(markup, /Generations/);
assert.match(markup, /Budget left/);
assert.match(markup, /Edit budget/);
assert.match(markup, /\$4\.82/, "period spend is real text");
assert.match(markup, /\$12\.75 all time/);
assert.match(markup, /-12%/, "change against the previous period");
assert.match(markup, /\$4\.82 \/ \$250/, "budget split as x / y");
assert.match(markup, /By day/);
assert.match(markup, /By format/);
assert.match(markup, /By model/);
assert.match(markup, /Generation log/);
assert.match(markup, /Export CSV/);
assert.match(markup, /Search cost log/);
assert.match(markup, /kling-3\.0-motion/);
assert.match(markup, /flux-pro/);
assert.match(markup, /job-1/);
assert.doesNotMatch(markup, /data-spend-|sr-only|—|–/);
assert.ok(markup.indexOf("Budget left") < markup.indexOf("By day"));
assert.ok(markup.indexOf("By day") < markup.indexOf("By format"));
assert.ok(markup.indexOf("By model") < markup.indexOf("Generation log"));

assert.match(emptyMarkup, /No spend in the last 30 days/);
assert.match(emptyMarkup, /Show 90 days/);
assert.doesNotMatch(emptyMarkup, /Generation log/, "an empty period shows one panel, not empty charts");
assert.doesNotMatch(emptyMarkup, /No matching cost entries/);
assert.match(emptyMarkup, /\$0\.00/, "zero spend in a period with no cost log is a real zero");

assert.match(matchingEmptyMarkup, /No matching cost entries/);
assert.match(matchingEmptyMarkup, /Clear filters/);
assert.match(matchingEmptyMarkup, /missing-job/);
assert.doesNotMatch(matchingEmptyMarkup, /No spend in the last/);

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
assert.match(pagedMarkup, /1-10 \/ 25/);
assert.match(pagedMarkup, /aria-label="Next cost log page"/);
assert.match(pagedMarkup, /aria-label="Previous cost log page"/);
assert.match(pagedMarkup, /value="flux"/);
assert.match(pagedMarkup, /value="flux-pro"/);
