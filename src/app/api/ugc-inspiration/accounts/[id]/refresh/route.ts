import { NextRequest, NextResponse } from "next/server";
import { syncTrackedInspirationAccount } from "@/lib/inspiration/service";
import { VirloApiError } from "@/lib/inspiration/virlo";

function errorResponse(error: unknown, fallback: string) {
  const status = error instanceof VirloApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await syncTrackedInspirationAccount(id);
    return NextResponse.json(account);
  } catch (error) {
    console.error("Failed to refresh inspiration account:", error);
    return errorResponse(error, "Failed to refresh inspiration account.");
  }
}
