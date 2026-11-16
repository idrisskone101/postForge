import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildGalleryWhere } from "@/lib/gallery";
import { jobsHistoryCutoff } from "@/lib/jobs/history-window";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const recentFailures = { status: "failed", createdAt: { gte: jobsHistoryCutoff() } };
    const [generationFailures, approvalsWaiting, latestFailedJob] = await Promise.all([
      prisma.generationJob.count({ where: recentFailures }),
      prisma.generatedFile.count({
        where: buildGalleryWhere({ type: "all", reviewStatus: "needs_review" }),
      }),
      prisma.generationJob.findFirst({
        where: recentFailures,
        orderBy: { createdAt: "desc" },
        select: { id: true },
      }),
    ]);

    return NextResponse.json(
      {
        generationFailures,
        approvalsWaiting,
        latestFailedJobId: latestFailedJob?.id ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Workspace notifications could not be loaded" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
