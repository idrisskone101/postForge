import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { CostLog } from "@/generated/prisma/client";
import {
  COST_LOG_PAGE_SIZE,
  buildDailyChartSeries,
  type DailyCostRow,
  type SpendChartPoint,
} from "./spend-period";

export async function logCost(
  jobId: string,
  modelId: string,
  type: string,
  amount: number,
  details?: Record<string, unknown>
): Promise<CostLog> {
  return prisma.costLog.create({
    data: {
      jobId,
      model: modelId,
      type,
      amount,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
    },
  });
}

export type CostSummary = {
  period: string;
  totalCost: number;
  breakdown: {
    image: { count: number; cost: number };
    video: { count: number; cost: number };
  };
  byModel: Record<string, { count: number; cost: number }>;
};

export type CostWindowSummary = Omit<CostSummary, "period">;

export type CostLogEntry = {
  id: string;
  jobId: string;
  model: string;
  type: string;
  amount: number;
  createdAt: string;
};

export type CostLogPage = {
  entries: CostLogEntry[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  hasNext: boolean;
};

function getPeriodStartDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "month": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "all":
      return null;
    default:
      return null;
  }
}

function costFromSum(amount: number | null, count: number): number {
  if (count === 0) return 0;
  if (amount == null) {
    throw new Error("CostLog amount sum was missing for a non-empty group");
  }
  return amount;
}

async function summarizeCosts(where: Prisma.CostLogWhereInput): Promise<CostWindowSummary> {
  const [byType, byModel] = await Promise.all([
    prisma.costLog.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.costLog.groupBy({
      by: ["model"],
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const imageStats = byType.find((group) => group.type === "image");
  const videoStats = byType.find((group) => group.type === "video");
  const imageCount = imageStats?._count.id ?? 0;
  const videoCount = videoStats?._count.id ?? 0;

  const breakdown = {
    image: {
      count: imageCount,
      cost: costFromSum(imageStats?._sum.amount ?? null, imageCount),
    },
    video: {
      count: videoCount,
      cost: costFromSum(videoStats?._sum.amount ?? null, videoCount),
    },
  };

  const byModelMap: Record<string, { count: number; cost: number }> = {};
  for (const group of byModel) {
    const count = group._count.id;
    byModelMap[group.model] = {
      count,
      cost: costFromSum(group._sum.amount, count),
    };
  }

  return {
    totalCost: breakdown.image.cost + breakdown.video.cost,
    breakdown,
    byModel: byModelMap,
  };
}

export async function getCostSummary(
  filters: {
    period?: "today" | "week" | "month" | "all";
    model?: string;
    type?: string;
  } = {}
): Promise<CostSummary> {
  const period = filters.period ?? "all";
  const startDate = getPeriodStartDate(period);

  const where: Prisma.CostLogWhereInput = {};
  if (startDate) {
    where.createdAt = { gte: startDate };
  }
  if (filters.model) {
    where.model = filters.model;
  }
  if (filters.type) {
    where.type = filters.type;
  }

  const summary = await summarizeCosts(where);
  return { period, ...summary };
}

export async function getCostSummaryForRange(
  start: Date,
  end: Date
): Promise<CostWindowSummary> {
  return summarizeCosts({ createdAt: { gte: start, lt: end } });
}

export async function getCostTotalForRange(start: Date, end: Date): Promise<number> {
  const aggregated = await prisma.costLog.aggregate({
    where: { createdAt: { gte: start, lt: end } },
    _sum: { amount: true },
    _count: true,
  });
  return costFromSum(aggregated._sum.amount, aggregated._count);
}

function readSqlAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function getDailyCostSeries(
  start: Date,
  end: Date,
  periodDays: number
): Promise<SpendChartPoint[]> {
  const rawRows = await prisma.$queryRaw<Array<{ day: string; type: string; cost: unknown }>>`
    SELECT
      to_char("createdAt", 'YYYY-MM-DD') AS day,
      "type",
      SUM("amount") AS cost
    FROM "CostLog"
    WHERE "createdAt" >= ${start}
      AND "createdAt" < ${end}
    GROUP BY day, "type"
  `;

  const rows: DailyCostRow[] = [];
  for (const row of rawRows) {
    const cost = readSqlAmount(row.cost);
    if (cost == null) continue;
    rows.push({ day: row.day, type: row.type, cost });
  }

  return buildDailyChartSeries(start, periodDays, rows);
}

function toCostLogEntry(row: {
  id: string;
  jobId: string;
  model: string;
  type: string;
  amount: number;
  createdAt: Date;
}): CostLogEntry {
  return {
    id: row.id,
    jobId: row.jobId,
    model: row.model,
    type: row.type,
    amount: row.amount,
    createdAt: row.createdAt.toISOString(),
  };
}

const costLogSelect = {
  id: true,
  jobId: true,
  createdAt: true,
  type: true,
  amount: true,
  model: true,
} as const;

export async function listCostLogsPage(args: {
  start: Date;
  end: Date;
  pageIndex: number;
}): Promise<CostLogPage> {
  const where = { createdAt: { gte: args.start, lt: args.end } };
  const totalCount = await prisma.costLog.count({ where });
  const lastPage = Math.max(0, Math.ceil(totalCount / COST_LOG_PAGE_SIZE) - 1);
  const pageIndex = Math.min(Math.max(0, args.pageIndex), lastPage);

  const rows = await prisma.costLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pageIndex * COST_LOG_PAGE_SIZE,
    take: COST_LOG_PAGE_SIZE,
    select: costLogSelect,
  });

  return {
    entries: rows.map(toCostLogEntry),
    pageIndex,
    pageSize: COST_LOG_PAGE_SIZE,
    totalCount,
    hasNext: (pageIndex + 1) * COST_LOG_PAGE_SIZE < totalCount,
  };
}
