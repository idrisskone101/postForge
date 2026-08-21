import { NextRequest, NextResponse } from "next/server";
import { exportCostLogsCsv } from "@/lib/costs/tracker";
import { parseSpendPeriod, spendWindow } from "@/lib/costs/spend-period";

export async function GET(request: NextRequest) {
  try {
    const period = parseSpendPeriod(
      request.nextUrl.searchParams.get("period") ?? undefined
    );
    const range = spendWindow(period);
    const exported = await exportCostLogsCsv(range.start, range.end);

    return new NextResponse(exported.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="postforge-spend-${period}.csv"`,
        "X-Row-Count": String(exported.rowCount),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export cost logs:", error);
    return NextResponse.json(
      { error: "Failed to export cost logs" },
      { status: 500 }
    );
  }
}
