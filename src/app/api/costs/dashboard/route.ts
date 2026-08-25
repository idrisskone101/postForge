import { NextRequest, NextResponse } from "next/server";
import { loadSpendDashboard } from "@/app/(app)/costs/spend-loader";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const dashboard = await loadSpendDashboard({
      period: params.get("period") ?? undefined,
      logPage: params.get("logPage") ?? undefined,
      q: params.get("q") ?? undefined,
      model: params.get("model") ?? undefined,
    });
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Failed to fetch spend dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch spend dashboard" },
      { status: 500 }
    );
  }
}
