import { prisma } from "@/lib/db";
import type { CostLog } from "@/generated/prisma/client";

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
    default:
      return null;
  }
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

  const where: Record<string, unknown> = {};
  if (startDate) {
    where.createdAt = { gte: startDate };
  }
  if (filters.model) {
    where.model = filters.model;
  }
  if (filters.type) {
    where.type = filters.type;
  }

  // Group by type
  const byType = await prisma.costLog.groupBy({
    by: ["type"],
    where,
    _sum: { amount: true },
    _count: { id: true },
  });

  // Group by model
  const byModel = await prisma.costLog.groupBy({
    by: ["model"],
    where,
    _sum: { amount: true },
    _count: { id: true },
  });

  const imageStats = byType.find((g: { type: string; _count: { id: number } | null; _sum: { amount: number | null } | null }) => g.type === "image");
  const videoStats = byType.find((g: { type: string; _count: { id: number } | null; _sum: { amount: number | null } | null }) => g.type === "video");

  const breakdown = {
    image: {
      count: imageStats?._count?.id ?? 0,
      cost: imageStats?._sum?.amount ?? 0,
    },
    video: {
      count: videoStats?._count?.id ?? 0,
      cost: videoStats?._sum?.amount ?? 0,
    },
  };

  const byModelMap: Record<string, { count: number; cost: number }> = {};
  for (const group of byModel) {
    byModelMap[group.model] = {
      count: group._count?.id ?? 0,
      cost: group._sum?.amount ?? 0,
    };
  }

  return {
    period,
    totalCost: breakdown.image.cost + breakdown.video.cost,
    breakdown,
    byModel: byModelMap,
  };
}
