import type { CostLogEntry } from "@/lib/costs/tracker";
import {
  COST_LOG_PAGE_SIZE,
  type SpendChartPoint,
  type SpendPeriod,
} from "@/lib/costs/spend-period";

export type SpendModelStats = {
  count: number;
  cost: number;
};

export type CostsPageClientProps = {
  totalCost: number;
  currentPeriodCost: number;
  changePercent: number;
  avgCycleCost: number;
  totalJobs: number;
  topModel: { name: string; cost: number; pct: string } | null;
  chartData: SpendChartPoint[];
  byModel: Record<string, SpendModelStats>;
  breakdown: {
    image: SpendModelStats;
    video: SpendModelStats;
  };
  logs: CostLogEntry[];
  logPage: number;
  logTotalCount: number;
  logHasNext: boolean;
  logFilterActive: boolean;
  search: string;
  model: string | null;
  period: SpendPeriod;
};

export type SpendPageHandlers = {
  onPeriodChange: (period: SpendPeriod) => void;
  onLogPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onModelChange: (model: string | null) => void;
  onClearFilters: () => void;
  onExportCsv: () => Promise<number>;
};

export type SpendPageContentProps = {
  dashboard: CostsPageClientProps;
  handlers: SpendPageHandlers;
};

export type SpendWorkflowSlice = {
  name: string;
  value: number;
};

export type SpendDashboardView = {
  modelEntries: Array<[string, SpendModelStats]>;
  totalModelCost: number;
  modelOptions: string[];
  totalPages: number;
  safeLogPage: number;
  emptyPeriod: boolean;
  imagePct: number;
  videoPct: number;
  workflowPieData: SpendWorkflowSlice[];
  budget: number;
  budgetPercent: number;
  budgetRemaining: number;
  changeIsUp: boolean;
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
