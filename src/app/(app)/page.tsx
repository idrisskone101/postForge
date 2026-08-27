import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getCostSummary } from "@/lib/costs/tracker";
import { getHomeActiveJobCutoff } from "@/lib/jobs/home-active";
import { getPendingReviewHomeJobs } from "@/lib/jobs/home-review";
import { getHomeJobProductionMetadata } from "@/lib/jobs/home-production-context";
import { HomeCockpit, HomeHeader } from "./home-cockpit";
import { type HomeJob } from "./home-types";
import { HomeEmptyPanel } from "./home-start-work";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <div className="pf-content-viewport bg-[var(--pf-canvas)]">
      <div className="mx-auto max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-8">
        <HomeHeader />
        <Suspense fallback={<HomeDashboardFallback />}>
          <HomeDashboard />
        </Suspense>
      </div>
    </div>
  );
}

function HomeDashboardFallback() {
  return (
    <>
      <section data-home-glance="true" aria-hidden="true">
        <a href="/costs">
          <span data-home-glance-label="Spend today" />
          <span />
        </a>
        <a href="/jobs?status=active">
          <span data-home-glance-label="Jobs running" />
          <span />
        </a>
        <a href="/gallery?reviewStatus=needs_review">
          <span data-home-glance-label="Awaiting review" />
          <span />
        </a>
        <a href="/gallery">
          <span data-home-glance-label="Completed this week" />
          <span />
        </a>
      </section>
      <HomeEmptyPanel className="mt-3" />
    </>
  );
}

async function HomeDashboard() {
  const now = new Date();
  const activeJobCutoff = getHomeActiveJobCutoff(now);
  const weekCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [todaySummary, recentJobs, activeJobs, activeJobCount, completedThisWeek, pendingReviewCount, recentMediaFiles] =
    await Promise.all([
      getCostSummary({ period: "today" }),
      getPendingReviewHomeJobs(12),
      prisma.generationJob.findMany({
        where: {
          status: { in: ["queued", "processing"] },
          OR: [
            { createdAt: { gte: activeJobCutoff } },
            { startedAt: { gte: activeJobCutoff } },
            { lockExpiresAt: { gte: now } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.generationJob.count({
        where: {
          status: { in: ["queued", "processing"] },
          OR: [
            { createdAt: { gte: activeJobCutoff } },
            { startedAt: { gte: activeJobCutoff } },
            { lockExpiresAt: { gte: now } },
          ],
        },
      }),
      prisma.generationJob.count({
        where: { status: "completed", completedAt: { gte: weekCutoff } },
      }),
      prisma.generatedFile.count({
        where: { reviewStatus: "needs_review" },
      }),
      prisma.generatedFile.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          jobId: true,
          type: true,
          width: true,
          height: true,
          durationSec: true,
          reviewStatus: true,
          createdAt: true,
          job: {
            select: { prompt: true, model: true, type: true, tags: true },
          },
        },
      }),
    ]);

  const sourceMetadata = new Map(
    [...activeJobs, ...recentJobs].map((job) => [
      job.id,
      getHomeJobProductionMetadata(job.input),
    ])
  );
  const avatarIds = Array.from(
    new Set(
      Array.from(sourceMetadata.values())
        .map((metadata) => metadata.identityId)
        .filter((id): id is string => id !== null)
    )
  );
  const sourceIds = Array.from(
    new Set(
      Array.from(sourceMetadata.values())
        .map((metadata) => metadata.sourceId)
        .filter((id): id is string => id !== null)
    )
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
  const productionContextFor = (jobId: string) => {
    const metadata = sourceMetadata.get(jobId);
    const sourceDetail = metadata?.sourceId
      ? sourceNames.get(metadata.sourceId) ?? metadata.sourceDetail
      : metadata?.sourceDetail ?? null;
    const identityDetail = metadata?.identityId
      ? avatarNames.get(metadata.identityId) ?? "Identity linked"
      : null;

    return { sourceDetail, identityDetail };
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
      },
    };
  }) satisfies HomeJob[];

  const activeHomeJobs = activeJobs.map((job) => ({
    id: job.id,
    prompt: job.prompt,
    type: job.type,
    model: job.model,
    status: job.status,
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

  return (
    <HomeCockpit
      bare
      dashboard={{
        todaySummary,
        activeJobs: activeHomeJobs,
        activeJobCount,
        recentJobs: visibleRecentJobs,
        completedThisWeek,
        pendingReviewCount,
        recentMedia,
        now,
      }}
    />
  );
}
