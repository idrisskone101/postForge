import { prisma } from "@/lib/db";
import { getCostSummary } from "@/lib/costs/tracker";
import { storage } from "@/lib/storage";
import { HomeCockpit, type HomeJob } from "./home-cockpit";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [todaySummary, monthSummary, recentJobs, activeJobs] =
    await Promise.all([
      getCostSummary({ period: "today" }),
      getCostSummary({ period: "month" }),
      prisma.generationJob.findMany({
        where: { status: "completed" },
        include: { outputs: { take: 1 } },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.generationJob.findMany({
        where: { status: { in: ["queued", "processing"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const visibleRecentJobs = (
    await Promise.all(
      recentJobs.map(async (job) => {
        const output = job.outputs[0];
        if (!output) return null;
        return (await storage.exists(output.localPath))
          ? {
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
            }
          : null;
      })
    )
  ).filter(Boolean) as HomeJob[];

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
