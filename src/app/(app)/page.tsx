import Link from "next/link";
import { Suspense } from "react";
import { buttonClass } from "@/components/workbench/button";
import { Icon } from "@/components/workbench/icon";
import { PageHeader } from "@/components/workbench/page-header";
import { prisma } from "@/lib/db";
import { getCostSummary } from "@/lib/costs/tracker";
import { getHomeActiveJobCutoff } from "@/lib/jobs/home-active";
import { getPendingReviewHomeJobs } from "@/lib/jobs/home-review";
import { getHomeJobProductionMetadata } from "@/lib/jobs/home-production-context";
import { workspaceNavigationGroups } from "@/lib/workspace-navigation";
import { HomeCockpit } from "./home-cockpit";
import { HomeLoadFailed } from "./home-failed";
import HomeLoading from "./home-loading";
import type { HomeDashboard as HomeDashboardData, HomeJob } from "./home-types";

export const dynamic = "force-dynamic";

const HOME_PRIMARY = workspaceNavigationGroups.overview[0].primaryAction;

export default async function HomePage() {
  return (
    <>
      <PageHeader title="Home">
        <Link href={HOME_PRIMARY.href} className={buttonClass("primary", 40)}>
          <Icon name={HOME_PRIMARY.icon} strokeWidth={2} />
          {HOME_PRIMARY.label}
        </Link>
      </PageHeader>
      <Suspense fallback={<HomeLoading />}>
        <HomeDashboard />
      </Suspense>
    </>
  );
}

async function HomeDashboard() {
  let dashboard: HomeDashboardData;
  try {
    dashboard = await loadHomeDashboard(new Date());
  } catch (error) {
    console.error("Home dashboard failed to load", error);
    return <HomeLoadFailed />;
  }
  return <HomeCockpit dashboard={dashboard} />;
}

async function loadHomeDashboard(now: Date): Promise<HomeDashboardData> {
  const activeJobCutoff = getHomeActiveJobCutoff(now);
  const weekCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const activeWhere = {
    status: { in: ["queued", "processing"] },
    OR: [
      { createdAt: { gte: activeJobCutoff } },
      { startedAt: { gte: activeJobCutoff } },
      { lockExpiresAt: { gte: now } },
    ],
  };
  const [
    todaySummary,
    monthSummary,
    recentJobs,
    activeJobs,
    activeByTypeRows,
    completedThisWeek,
    weekReviewRows,
    pendingReviewCount,
    oldestPending,
    recentMediaFiles,
  ] = await Promise.all([
    getCostSummary({ period: "today" }),
    getCostSummary({ period: "month" }),
    getPendingReviewHomeJobs(12),
    prisma.generationJob.findMany({
      where: activeWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.generationJob.groupBy({
      by: ["type"],
      where: activeWhere,
      _count: { _all: true },
    }),
    prisma.generationJob.count({
      where: { status: "completed", completedAt: { gte: weekCutoff } },
    }),
    prisma.generatedFile.groupBy({
      by: ["reviewStatus"],
      where: { job: { status: "completed", completedAt: { gte: weekCutoff } } },
      _count: { _all: true },
    }),
    prisma.generatedFile.count({
      where: { reviewStatus: "needs_review" },
    }),
    prisma.generatedFile.findFirst({
      where: { reviewStatus: "needs_review" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.generatedFile.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        jobId: true,
        type: true,
        durationSec: true,
        reviewStatus: true,
        job: {
          select: { prompt: true, model: true, type: true, tags: true },
        },
      },
    }),
  ]);

  const productionContextFor = await loadProductionContext([...activeJobs, ...recentJobs]);
  const countWhere = <T extends { _count: { _all: number } }>(rows: T[], match: (row: T) => boolean) =>
    rows.filter(match).reduce((sum, row) => sum + row._count._all, 0);
  const activeByType = {
    video: countWhere(activeByTypeRows, (row) => row.type === "video"),
    image: countWhere(activeByTypeRows, (row) => row.type !== "video"),
  };

  const visibleRecentJobs = recentJobs.map((job) => {
    const output = job.outputs[0];
    return {
      id: job.id,
      prompt: job.prompt,
      type: job.type,
      model: job.model,
      status: job.status,
      tags: job.tags,
      createdAt: job.createdAt,
      productionContext: productionContextFor(job.id),
      output: {
        id: output.id,
        width: output.width,
        height: output.height,
        durationSec: output.durationSec,
        createdAt: output.createdAt,
      },
    };
  }) satisfies HomeJob[];

  const activeHomeJobs = activeJobs.map((job) => ({
    id: job.id,
    prompt: job.prompt,
    type: job.type,
    model: job.model,
    status: job.status,
    queueStage: job.queueStage,
    tags: job.tags,
    createdAt: job.createdAt,
    productionContext: productionContextFor(job.id),
  })) satisfies HomeJob[];

  const recentMedia = recentMediaFiles.map((file) => ({
    id: file.id,
    jobId: file.jobId,
    type: file.type,
    jobType: file.job.type,
    durationSec: file.durationSec,
    reviewStatus: file.reviewStatus,
    model: file.job.model,
    prompt: file.job.prompt,
    isClone: file.job.type === "video" && file.job.tags?.includes("ugc-clone") === true,
  }));

  return {
    todaySummary,
    monthSpend: monthSummary.totalCost,
    activeJobs: activeHomeJobs,
    activeJobCount: activeByType.video + activeByType.image,
    activeByType,
    recentJobs: visibleRecentJobs,
    completedThisWeek,
    weekReview: {
      approved: countWhere(weekReviewRows, (row) => row.reviewStatus === "approved_output"),
      rejected: countWhere(weekReviewRows, (row) => row.reviewStatus === "rejected_output"),
    },
    pendingReviewCount,
    oldestPendingAt: oldestPending?.createdAt ?? null,
    recentMedia,
    now,
  };
}

async function loadProductionContext(jobs: Array<{ id: string; input: unknown }>) {
  const sourceMetadata = new Map(
    jobs.map((job) => [job.id, getHomeJobProductionMetadata(job.input)])
  );
  const metadata = Array.from(sourceMetadata.values());
  const avatarIds = Array.from(
    new Set(metadata.map((entry) => entry.identityId).filter((id): id is string => id !== null))
  );
  const sourceIds = Array.from(
    new Set(metadata.map((entry) => entry.sourceId).filter((id): id is string => id !== null))
  );
  const [avatars, sources] = await Promise.all([
    prisma.avatar.findMany({
      where: { id: { in: avatarIds } },
      select: { id: true, name: true },
    }),
    prisma.tikTokSource.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, label: true },
    }),
  ]);
  const avatarNames = new Map(avatars.map((avatar) => [avatar.id, avatar.name]));
  const sourceNames = new Map(sources.map((source) => [source.id, source.label]));

  return (jobId: string) => {
    const entry = sourceMetadata.get(jobId);
    const sourceDetail = entry?.sourceId
      ? sourceNames.get(entry.sourceId) ?? entry.sourceDetail
      : entry?.sourceDetail ?? null;
    const identityDetail = entry?.identityId
      ? avatarNames.get(entry.identityId) ?? "Identity linked"
      : null;
    return { sourceDetail, identityDetail };
  };
}
