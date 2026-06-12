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

  const summary = await getCostSummary({ period: "all" });

  // Date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);
  startDate.setHours(0, 0, 0, 0);

  // Previous period for comparison
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - periodDays);

  const [costLogs, prevCostLogs, recentLogs] = await Promise.all([
    prisma.costLog.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, type: true, amount: true, model: true },
    }),
    prisma.costLog.findMany({
      where: { createdAt: { gte: prevStartDate, lt: startDate } },
      select: { amount: true },
    }),
    prisma.costLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        jobId: true,
        model: true,
        type: true,
        amount: true,
        createdAt: true,
      },
    }),
  ]);

  // Current period total
  const currentTotal = costLogs.reduce((sum, log) => sum + log.amount, 0);
  const prevTotal = prevCostLogs.reduce((sum, log) => sum + log.amount, 0);
  const changePercent = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

  // Aggregate by date and type
  const dailyMap = new Map<string, { image: number; video: number }>();
  for (let i = 0; i < periodDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { image: 0, video: 0 });
  }

  for (const log of costLogs) {
    const key = log.createdAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (entry) {
      if (log.type === "image") entry.image += log.amount;
      else entry.video += log.amount;
    }
  }

  const chartData = Array.from(dailyMap.entries()).map(([date, costs]) => ({
    date: new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    image: Math.round(costs.image * 100) / 100,
    video: Math.round(costs.video * 100) / 100,
  }));

  // Compute top model
  const modelEntries = Object.entries(summary.byModel);
  const topModel =
    modelEntries.length > 0
      ? modelEntries.sort((a, b) => b[1].cost - a[1].cost)[0]
      : null;

  const totalJobs = summary.breakdown.image.count + summary.breakdown.video.count;
  const avgCycleCost = totalJobs > 0 ? summary.totalCost / totalJobs : 0;
  const topModelPct = topModel && summary.totalCost > 0
    ? (topModel[1].cost / summary.totalCost * 100).toFixed(0)
    : "0";

  // Format logs
  const formattedLogs = recentLogs.map((log) => ({
    id: log.id,
    jobId: log.jobId,
    model: log.model,
    type: log.type,
    amount: log.amount,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <CostsPageClient
      totalCost={summary.totalCost}
      currentPeriodCost={currentTotal}
      changePercent={changePercent}
      avgCycleCost={avgCycleCost}
      totalJobs={totalJobs}
      topModel={topModel ? { name: topModel[0], cost: topModel[1].cost, pct: topModelPct } : null}
      chartData={chartData}
      byModel={summary.byModel}
      breakdown={summary.breakdown}
      logs={formattedLogs}
      period={periodLabel}
    />
  );
}
