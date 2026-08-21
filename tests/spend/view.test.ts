import assert from "node:assert/strict";
import { COST_LOG_PAGE_SIZE } from "../../src/lib/costs/spend-period";
import { buildSpendDashboardView } from "../../src/app/costs/spend-models";

const emptyBreakdown = {
  image: { count: 0, cost: 0 },
  video: { count: 0, cost: 0 },
};

const emptyView = buildSpendDashboardView({
  byModel: {},
  model: null,
  logPage: 0,
  logTotalCount: 0,
  logFilterActive: false,
  breakdown: emptyBreakdown,
  currentPeriodCost: 0,
  budget: 250,
  changePercent: 0,
});

assert.equal(COST_LOG_PAGE_SIZE, 10);
assert.equal(emptyView.totalPages, 1);
assert.equal(emptyView.safeLogPage, 0);
assert.equal(emptyView.emptyPeriod, true);
assert.equal(emptyView.workflowPieData.length, 0);
assert.equal(emptyView.budgetPercent, 0);
assert.equal(emptyView.budgetRemaining, 250);

const paged = buildSpendDashboardView({
  byModel: { "flux-pro": { count: 25, cost: 4.82 } },
  model: "kling-3.0-motion",
  logPage: 4,
  logTotalCount: 25,
  logFilterActive: true,
  breakdown: {
    image: { count: 20, cost: 1.25 },
    video: { count: 5, cost: 3.57 },
  },
  currentPeriodCost: 200,
  budget: 250,
  changePercent: 12,
});

assert.equal(paged.totalPages, 3);
assert.equal(paged.safeLogPage, 2);
assert.equal(paged.emptyPeriod, false);
assert.deepEqual(paged.modelOptions, ["kling-3.0-motion", "flux-pro"]);
assert.equal(paged.imagePct.toFixed(0), "26");
assert.equal(paged.videoPct.toFixed(0), "74");
assert.equal(paged.workflowPieData.length, 2);
assert.equal(paged.budgetPercent, 80);
assert.equal(paged.budgetRemaining, 50);
assert.equal(paged.changeIsUp, true);
