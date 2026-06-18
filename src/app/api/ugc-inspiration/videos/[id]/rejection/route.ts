import { NextRequest, NextResponse } from "next/server";
import { setInspirationVideoRejection } from "@/lib/inspiration/service";
import { VirloApiError } from "@/lib/inspiration/virlo";

function errorResponse(error: unknown, fallback: string) {
  const status = error instanceof VirloApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as {
      rejected?: unknown;
    } | null;

    if (typeof body?.rejected !== "boolean") {
      return NextResponse.json(
        { error: "rejected must be a boolean" },
        { status: 400 }
      );
    }

    const result = await setInspirationVideoRejection(id, body.rejected);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update inspiration rejection:", error);
    return errorResponse(error, "Failed to update inspiration rejection.");
  }
}
