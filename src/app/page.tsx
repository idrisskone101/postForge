import { prisma } from "@/lib/db";
import { getCostSummary } from "@/lib/costs/tracker";
import { getHomeActiveJobCutoff } from "@/lib/jobs/home-active";
import { getPendingReviewHomeJobs } from "@/lib/jobs/home-review";
import { getHomeJobProductionMetadata } from "@/lib/jobs/home-production-context";
import { HomeCockpit, type HomeJob } from "./home-cockpit";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const activeJobCutoff = getHomeActiveJobCutoff(now);
  const [todaySummary, monthSummary, recentJobs, activeJobs] =
    await Promise.all([
      getCostSummary({ period: "today" }),
      getCostSummary({ period: "month" }),
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

  return (
    <HomeCockpit
      todaySummary={todaySummary}
      monthSummary={monthSummary}
      activeJobs={activeHomeJobs}
      recentJobs={visibleRecentJobs}
      now={now}
    />
  );
}
