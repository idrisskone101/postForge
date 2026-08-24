import { Suspense } from "react";
import {
  getCostSummary,
  getCostSummaryForRange,
  getCostTotalForRange,
  getDailyCostSeries,
  listCostLogsPage,
} from "@/lib/costs/tracker";
import {
  hasCostLogFilter,
  parseCostLogModel,
  parseCostLogSearch,
  parseLogPage,
  parseSpendPeriod,
  periodChangePercent,
  spendWindow,
} from "@/lib/costs/spend-period";
import { CostsPageClient } from "./costs-page-client";
import { EMPTY_COSTS_DASHBOARD } from "./spend-models";

export const metadata = { title: "Spend - PostForge" };

interface CostsPageProps {
  searchParams: Promise<{
    period?: string;
    logPage?: string;
    q?: string;
    model?: string;
  }>;
}

export default function CostsPage({ searchParams }: CostsPageProps) {
  return (
    <Suspense fallback={<CostsPageClient {...EMPTY_COSTS_DASHBOARD} />}>
      <CostsPageData searchParams={searchParams} />
    </Suspense>
  );
}

async function CostsPageData({ searchParams }: CostsPageProps) {
  const {
    period: periodParam,
    logPage: logPageParam,
    q: searchParam,
    model: modelParam,
  } = await searchParams;
  const period = parseSpendPeriod(periodParam);
  const range = spendWindow(period);
  const requestedPage = parseLogPage(logPageParam);
  const filter = {
    search: parseCostLogSearch(searchParam),
    model: parseCostLogModel(modelParam),
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
      }),
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

  return (
    <CostsPageClient
      totalCost={allTimeSummary.totalCost}
      currentPeriodCost={currentTotal}
      changePercent={changePercent}
      avgCycleCost={avgCycleCost}
      totalJobs={totalJobs}
      topModel={topModel ? { name: topModel[0], cost: topModel[1].cost, pct: topModelPct } : null}
      chartData={chartData}
      byModel={byModel}
      breakdown={breakdown}
      logs={logPage.entries}
      logPage={logPage.pageIndex}
      logTotalCount={logPage.totalCount}
      logHasNext={logPage.hasNext}
      logFilterActive={hasCostLogFilter(filter)}
      search={filter.search}
      model={filter.model}
      period={period}
    />
  );
}
