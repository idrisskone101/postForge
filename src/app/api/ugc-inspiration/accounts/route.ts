import { NextRequest, NextResponse } from "next/server";
import {
  createTrackedInspirationAccount,
  listTrackedInspirationAccounts,
} from "@/lib/inspiration/service";
import { VirloApiError } from "@/lib/inspiration/virlo";

function errorResponse(error: unknown, fallback: string) {
  const status = error instanceof VirloApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const accounts = await listTrackedInspirationAccounts();
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Failed to list inspiration accounts:", error);
    return errorResponse(error, "Failed to list inspiration accounts.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.handle || typeof body.handle !== "string") {
      return NextResponse.json(
        { error: "handle is required and must be a string" },
        { status: 400 }
      );
    }

    const account = await createTrackedInspirationAccount(body.handle);
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Failed to create inspiration account:", error);
    return errorResponse(error, "Failed to create inspiration account.");
  }
}
