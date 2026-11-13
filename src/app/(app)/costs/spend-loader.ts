import {
  getCostSummary,
  getCostSummaryForRange,
  getCostTotalForRange,
  getDailyCostSeries,
  listCostLogsPage,
  type CostLogEntry,
} from "@/lib/costs/tracker";
import { prisma } from "@/lib/db";
import {
  hasCostLogFilter,
  parseCostLogModel,
  parseCostLogSearch,
  parseLogPage,
  parseSpendPeriod,
  periodChangePercent,
  spendWindow,
} from "@/lib/costs/spend-period";
import { joinCostLogJobs } from "./spend-log-jobs";
import type { CostsPageClientProps, SpendLogRow } from "./types";

export async function loadSpendDashboard(params: {
  period?: string;
  logPage?: string;
  q?: string;
  model?: string;
}): Promise<CostsPageClientProps> {
  const period = parseSpendPeriod(params.period);
  const range = spendWindow(period);
  const requestedPage = parseLogPage(params.logPage);
  const filter = {
    search: parseCostLogSearch(params.q),
    model: parseCostLogModel(params.model),
  };

  const [allTimeSummary, windowSummary, previousTotal, chartData, logPage] =
    await Promise.all([
      getCostSummary({ period: "all" }),
      getCostSummaryForRange(range.start, range.end),
      getCostTotalForRange(range.previousStart, range.start),
      getDailyCostSeries(range.start, range.end, range.periodDays),
      listCostLogsPage({
        start: range.start,
        end: range.end,
        pageIndex: requestedPage,
        filter,
      }).then(async (page) => ({ ...page, rows: await withCostLogJobs(page.entries) })),
    ]);

  const currentTotal = windowSummary.totalCost;
  const changePercent = periodChangePercent(currentTotal, previousTotal);
  const { breakdown, byModel } = windowSummary;
  const modelEntries = Object.entries(byModel);
  const topModel =
    modelEntries.length > 0
      ? modelEntries.sort((a, b) => b[1].cost - a[1].cost)[0]
      : null;
  const totalJobs = breakdown.image.count + breakdown.video.count;
  const avgCycleCost = totalJobs > 0 ? currentTotal / totalJobs : 0;
  const topModelPct =
    topModel && currentTotal > 0
      ? ((topModel[1].cost / currentTotal) * 100).toFixed(0)
      : "0";

  return {
    totalCost: allTimeSummary.totalCost,
    currentPeriodCost: currentTotal,
    changePercent,
    previousPeriodCost: hasSpendBefore(allTimeSummary.byModel, windowSummary.byModel)
      ? previousTotal
      : null,
    avgCycleCost,
    totalJobs,
    topModel: topModel
      ? { name: topModel[0], cost: topModel[1].cost, pct: topModelPct }
      : null,
    chartData,
    byModel,
    breakdown,
    logs: logPage.rows,
    logPage: logPage.pageIndex,
    logTotalCount: logPage.totalCount,
    logHasNext: logPage.hasNext,
    logFilterActive: hasCostLogFilter(filter),
    search: filter.search,
    model: filter.model,
    period,
  };
}

function hasSpendBefore(
  allTime: Record<string, { count: number }>,
  window: Record<string, { count: number }>,
) {
  const count = (byModel: Record<string, { count: number }>) =>
    Object.values(byModel).reduce((sum, stats) => sum + stats.count, 0);
  return count(allTime) > count(window);
}

async function withCostLogJobs(entries: CostLogEntry[]): Promise<SpendLogRow[]> {
  const jobIds = [...new Set(entries.map((entry) => entry.jobId))];
  const jobs =
    jobIds.length === 0
      ? []
      : await prisma.generationJob.findMany({
          where: { id: { in: jobIds } },
          select: {
            id: true,
            type: true,
            status: true,
            model: true,
            prompt: true,
            tags: true,
            input: true,
            outputs: {
              where: { type: "image" },
              orderBy: { createdAt: "asc" },
              take: 1,
              select: { id: true, type: true },
            },
          },
        });
  return joinCostLogJobs(entries, jobs);
}
