import { NextRequest, NextResponse } from "next/server";
import { getCostSummary } from "@/lib/costs/tracker";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const period = (searchParams.get("period") ?? "month") as
      | "today"
      | "week"
      | "month"
      | "all";
    const model = searchParams.get("model") ?? undefined;
    const type = searchParams.get("type") ?? undefined;

    const summary = await getCostSummary({ period, model, type });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Failed to fetch cost summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost summary" },
      { status: 500 }
    );
  }
}
