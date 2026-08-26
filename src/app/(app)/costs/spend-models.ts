import { COST_LOG_PAGE_SIZE } from "@/lib/costs/spend-period";
import type {
  CostsPageClientProps,
  SpendDashboardView,
  SpendModelStats,
} from "./types";

export type {
  CostsPageClientProps,
  SpendDashboardView,
  SpendModelStats,
  SpendPageContentProps,
  SpendPageHandlers,
  SpendWorkflowSlice,
} from "./types";

export const EMPTY_COSTS_DASHBOARD: CostsPageClientProps = {
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
  logPage: 0,
  logTotalCount: 0,
  logHasNext: false,
  logFilterActive: false,
  search: "",
  model: null,
  period: "30d",
};

export function buildSpendDashboardView(input: {
  byModel: Record<string, SpendModelStats>;
  model: string | null;
  logPage: number;
  logTotalCount: number;
  logFilterActive: boolean;
  breakdown: CostsPageClientProps["breakdown"];
  currentPeriodCost: number;
  budget: number;
  changePercent: number;
}): SpendDashboardView {
  const modelEntries = Object.entries(input.byModel).sort(
    (left, right) => right[1].cost - left[1].cost
  );
  const totalModelCost = modelEntries.reduce(
    (sum, [, data]) => sum + data.cost,
    0
  );
  const modelNames = modelEntries.map(([name]) => name);
  const modelOptions =
    input.model && !modelNames.includes(input.model)
      ? [input.model, ...modelNames]
      : modelNames;
  const totalPages = Math.max(
    1,
    Math.ceil(input.logTotalCount / COST_LOG_PAGE_SIZE)
  );
  const formatTotal = input.breakdown.image.cost + input.breakdown.video.cost;

  return {
    modelEntries,
    totalModelCost,
    modelOptions,
    totalPages,
    safeLogPage: Math.min(input.logPage, totalPages - 1),
    emptyPeriod: input.logTotalCount === 0 && !input.logFilterActive,
    imagePct:
      formatTotal > 0 ? (input.breakdown.image.cost / formatTotal) * 100 : 0,
    videoPct:
      formatTotal > 0 ? (input.breakdown.video.cost / formatTotal) * 100 : 0,
    workflowPieData: [
      { name: "Image", value: input.breakdown.image.cost },
      { name: "Video", value: input.breakdown.video.cost },
    ].filter((entry) => entry.value > 0),
    budget: input.budget,
    budgetPercent:
      input.budget > 0
        ? Math.min(100, (input.currentPeriodCost / input.budget) * 100)
        : 0,
    budgetRemaining: Math.max(0, input.budget - input.currentPeriodCost),
    changeIsUp: input.changePercent > 0,
  };
}
