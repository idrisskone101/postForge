import { prisma } from "@/lib/db";
import { getCostSummary } from "@/lib/costs/tracker";
import { getHomeActiveJobCutoff } from "@/lib/jobs/home-active";
import { getPendingReviewHomeJobs } from "@/lib/jobs/home-review";
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

  const visibleRecentJobs = recentJobs.map((job) => {
    const output = job.outputs[0];
    return {
      id: job.id,
      prompt: job.prompt,
      type: job.type,
      model: job.model,
      status: job.status,
      createdAt: job.createdAt,
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
    createdAt: job.createdAt,
  }));

  return (
    <HomeCockpit
      todaySummary={todaySummary}
      monthSummary={monthSummary}
      activeJobs={activeHomeJobs}
      recentJobs={visibleRecentJobs}
    />
  );
}
