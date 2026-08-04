import { prisma } from "@/lib/db";
import { getCostSummary } from "@/lib/costs/tracker";
import { CostsPageClient } from "./costs-page-client";

export const metadata = { title: "Spend - PostForge" };

interface CostsPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function CostsPage({ searchParams }: CostsPageProps) {
  const { period: periodParam } = await searchParams;
  const periodDays = periodParam === "7d" ? 7 : periodParam === "90d" ? 90 : 30;
  const periodLabel = periodParam === "7d" ? "7d" : periodParam === "90d" ? "90d" : "30d";

  const allTimeSummaryPromise = getCostSummary({ period: "all" });

  // The selected range includes today and exactly periodDays - 1 prior days.
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (periodDays - 1));
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 1);
  endDate.setHours(0, 0, 0, 0);

  // Previous period for comparison
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - periodDays);

  const [allTimeSummary, costLogs, prevCostLogs] = await Promise.all([
    allTimeSummaryPromise,
    prisma.costLog.findMany({
      where: { createdAt: { gte: startDate, lt: endDate } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        jobId: true,
        createdAt: true,
        type: true,
        amount: true,
        model: true,
      },
    }),
    prisma.costLog.findMany({
      where: { createdAt: { gte: prevStartDate, lt: startDate } },
      select: { amount: true },
    }),
  ]);

  // Current period total
  const currentTotal = costLogs.reduce((sum, log) => sum + log.amount, 0);
  const prevTotal = prevCostLogs.reduce((sum, log) => sum + log.amount, 0);
  const changePercent = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

  const dayKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  // Aggregate every selected-period metric from the same bounded log set.
  const dailyMap = new Map<string, { image: number; video: number }>();
  for (let i = 0; i < periodDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = dayKey(d);
    dailyMap.set(key, { image: 0, video: 0 });
  }

  for (const log of costLogs) {
    const key = dayKey(log.createdAt);
    const entry = dailyMap.get(key);
    if (entry) {
      if (log.type === "image") entry.image += log.amount;
      else entry.video += log.amount;
    }
  }

  const chartData = Array.from(dailyMap.entries()).map(([date, costs]) => ({
    date: new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    image: Math.round(costs.image * 100) / 100,
    video: Math.round(costs.video * 100) / 100,
  }));

  const breakdown = {
    image: { count: 0, cost: 0 },
    video: { count: 0, cost: 0 },
  };
  const byModel: Record<string, { count: number; cost: number }> = {};
  for (const log of costLogs) {
    const bucket = log.type === "image" ? breakdown.image : breakdown.video;
    bucket.count += 1;
    bucket.cost += log.amount;
    const model = byModel[log.model] ?? { count: 0, cost: 0 };
    model.count += 1;
    model.cost += log.amount;
    byModel[log.model] = model;
  }

  // Compute top model for the selected period.
  const modelEntries = Object.entries(byModel);
  const topModel =
    modelEntries.length > 0
      ? modelEntries.sort((a, b) => b[1].cost - a[1].cost)[0]
      : null;

  const totalJobs = breakdown.image.count + breakdown.video.count;
  const avgCycleCost = totalJobs > 0 ? currentTotal / totalJobs : 0;
  const topModelPct = topModel && currentTotal > 0
    ? (topModel[1].cost / currentTotal * 100).toFixed(0)
    : "0";

  // Format logs
  const formattedLogs = [...costLogs].reverse().map((log) => ({
    id: log.id,
    jobId: log.jobId,
    model: log.model,
    type: log.type,
    amount: log.amount,
    createdAt: log.createdAt.toISOString(),
  }));

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
      logs={formattedLogs}
      period={periodLabel}
    />
  );
}
