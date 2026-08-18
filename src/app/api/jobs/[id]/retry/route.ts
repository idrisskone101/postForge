import { NextRequest, NextResponse } from "next/server";
import { retryGenerationJob } from "@/lib/jobs/retry-generation";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await retryGenerationJob(id);
  return NextResponse.json(result.body, { status: result.status });
}
