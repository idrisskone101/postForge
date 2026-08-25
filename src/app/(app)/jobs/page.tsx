import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";
import type { JobsStatusFilter, JobsTypeFilter } from "./jobs-activity";
import { JobsActivityLazy } from "./jobs-activity-lazy";
import { JobsAutoRefresh } from "./jobs-auto-refresh";

export const metadata = { title: "Jobs - PostForge" };
export const dynamic = "force-dynamic";

export default function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>;
}) {
  return (
    <Suspense fallback={<WorkspaceRouteSkeleton />}>
      <JobsPageData searchParams={searchParams} />
    </Suspense>
  );
}

async function JobsPageData({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const type = parseType(params.type);
  const page = parsePage(params.page);
  const historyCutoff = new Date();
  historyCutoff.setDate(historyCutoff.getDate() - HISTORY_DAYS);
  const activeStatuses = ["queued", "processing"];

  const visibleWindow: Prisma.GenerationJobWhereInput = {
    OR: [
      { status: { in: activeStatuses } },
      {
        status: { in: ["completed", "failed"] },
        createdAt: { gte: historyCutoff },
      },
    ],
  };
  const statusWhere: Prisma.GenerationJobWhereInput =
    status === "active"
      ? { status: { in: activeStatuses } }
      : status === "completed" || status === "failed"
        ? { status }
        : {};
  const typeWhere: Prisma.GenerationJobWhereInput =
    type === "all" ? {} : { type };
  const where: Prisma.GenerationJobWhereInput = {
    AND: [visibleWindow, statusWhere, typeWhere],
  };

  const [jobs, filteredTotal, activeCount, completedCount, failedCount, totalCreated] =
    await Promise.all([
      prisma.generationJob.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          type: true,
          model: true,
          status: true,
          queueStage: true,
          prompt: true,
          input: true,
          tags: true,
          estimatedCost: true,
          actualCost: true,
          durationMs: true,
          error: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.generationJob.count({ where }),
      prisma.generationJob.count({ where: { status: { in: activeStatuses } } }),
      prisma.generationJob.count({
        where: { status: "completed", createdAt: { gte: historyCutoff } },
      }),
      prisma.generationJob.count({
        where: { status: "failed", createdAt: { gte: historyCutoff } },
      }),
      prisma.generationJob.count({ where: { createdAt: { gte: historyCutoff } } }),
    ]);

  return (
    <>
      <JobsAutoRefresh enabled={activeCount > 0} />
      <JobsActivityLazy
        activity={{
          jobs,
          counts: {
            active: activeCount,
            completed: completedCount,
            failed: failedCount,
            total: totalCreated,
          },
          status,
          type,
          page,
          pageSize: PAGE_SIZE,
          filteredTotal,
        }}
      />
    </>
  );
}


const HISTORY_DAYS = 30;
const PAGE_SIZE = 40;

function parseStatus(value: string | undefined): JobsStatusFilter {
  return value === "active" || value === "completed" || value === "failed"
    ? value
    : "all";
}

function parseType(value: string | undefined): JobsTypeFilter {
  return value === "image" || value === "video" ? value : "all";
}

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}