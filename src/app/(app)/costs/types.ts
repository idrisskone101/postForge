import type { CostLogEntry } from "@/lib/costs/tracker";
import type { SpendChartPoint, SpendPeriod } from "@/lib/costs/spend-period";

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

export type SpendStatCardsProps = {
  dashboard: CostsPageClientProps;
  view: SpendDashboardView;
};

export type SpendAnalysisGridProps = {
  dashboard: CostsPageClientProps;
  view: SpendDashboardView;
};

export type SpendGenerationLogProps = {
  dashboard: CostsPageClientProps;
  view: SpendDashboardView;
  handlers: SpendPageHandlers;
};

export type SpendBudgetDialogProps = {
  budgetInput: string;
  onBudgetInputChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};
