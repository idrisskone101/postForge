import { NextRequest, NextResponse } from "next/server";
import { listJobs } from "@/lib/jobs/queue";
import { ensurePollerRunning } from "@/lib/jobs/poller";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const type = searchParams.get("type") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const model = searchParams.get("model") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const sortParam = searchParams.get("sort") ?? "createdAt:desc";

    // Validate limit and offset
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "limit must be a number between 1 and 100" },
        { status: 400 }
      );
    }
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: "offset must be a non-negative number" },
        { status: 400 }
      );
    }

    // Parse sort into direction for listJobs
    const [, sortDir] = sortParam.split(":");
    const sort = (sortDir === "asc" ? "asc" : "desc") as "asc" | "desc";

    const result = await listJobs({ type, status, model, tag, limit, offset, sort });

    if (result.jobs.some((job) => job.status === "processing" && job.type === "video")) {
      ensurePollerRunning();
    }

    return NextResponse.json({
      jobs: result.jobs,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to list jobs:", error);
    return NextResponse.json(
      { error: "Failed to list jobs" },
      { status: 500 }
    );
  }
}
