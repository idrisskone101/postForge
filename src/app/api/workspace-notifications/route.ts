import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [generationFailures, approvalsWaiting, latestFailedJob] = await Promise.all([
      prisma.generationJob.count({ where: { status: "failed" } }),
      prisma.generatedFile.count({ where: { reviewStatus: "needs_review" } }),
      prisma.generationJob.findFirst({
        where: { status: "failed" },
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
