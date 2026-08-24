import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getCostSummary } from "@/lib/costs/tracker";
import { getHomeActiveJobCutoff } from "@/lib/jobs/home-active";
import { getPendingReviewHomeJobs } from "@/lib/jobs/home-review";
import { getHomeJobProductionMetadata } from "@/lib/jobs/home-production-context";
import { HomeCockpit } from "./home-cockpit";
import { type HomeJob } from "./home-cockpit";
import HomeLoading from "./home-loading";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeDashboard />
    </Suspense>
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
