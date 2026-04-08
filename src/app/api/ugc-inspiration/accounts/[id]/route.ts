import { NextRequest, NextResponse } from "next/server";
import { deleteTrackedInspirationAccount } from "@/lib/inspiration/service";
import { VirloApiError } from "@/lib/inspiration/virlo";

function errorResponse(error: unknown, fallback: string) {
  const status = error instanceof VirloApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteTrackedInspirationAccount(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete inspiration account:", error);
    return errorResponse(error, "Failed to delete inspiration account.");
  }
}
