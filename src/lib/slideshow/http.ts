import { NextRequest, NextResponse } from "next/server";
import { SlideshowApiError } from "@/lib/slideshow/errors";

export async function readJsonRequest(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new SlideshowApiError(
      400,
      "invalid_json",
      "Request body must be valid JSON"
    );
  }
}

export function slideshowErrorResponse(error: unknown, fallback: string) {
  if (error instanceof SlideshowApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details ?? {}),
      },
      { status: error.status }
    );
  }

  const prismaCode =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : null;
  if (prismaCode === "P2003") {
    return NextResponse.json(
      {
        error: "A referenced slideshow record does not exist",
        code: "invalid_reference",
      },
      { status: 400 }
    );
  }
  if (prismaCode === "P2002") {
    return NextResponse.json(
      {
        error: "The requested slideshow order conflicts with an existing record",
        code: "constraint_conflict",
      },
      { status: 409 }
    );
  }
  if (prismaCode === "P2025") {
    return NextResponse.json(
      { error: "Slideshow record not found", code: "not_found" },
      { status: 404 }
    );
  }

  console.error(fallback, error);
  return NextResponse.json(
    { error: fallback, code: "internal_error" },
    { status: 500 }
  );
}

export function paginationFrom(request: NextRequest) {
  const limitValue = Number(request.nextUrl.searchParams.get("limit") ?? 20);
  const offsetValue = Number(request.nextUrl.searchParams.get("offset") ?? 0);

  if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 100) {
    throw new SlideshowApiError(
      400,
      "invalid_pagination",
      "limit must be an integer between 1 and 100"
    );
  }

  if (!Number.isInteger(offsetValue) || offsetValue < 0) {
    throw new SlideshowApiError(
      400,
      "invalid_pagination",
      "offset must be a non-negative integer"
    );
  }

  return { limit: limitValue, offset: offsetValue };
}
