import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  OutputReviewStatusError,
  serializeOutputReviewStatus,
  updateOutputReviewStatus,
} from "@/lib/output-review-status";
import {
  assertAssetsAreNotPublicationLeased,
  UnresolvedPublicationConflictError,
  withLockedAutomationRecords,
} from "@/lib/publication-lifecycle";
import { isSameOriginMutation } from "@/lib/http";
import { rejectCrossOriginMutation } from "@/lib/integrations/routes";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const output = await prisma.generatedFile.findUnique({
      where: { id },
      select: { id: true, reviewStatus: true },
    });

    if (!output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: output.id,
      reviewStatus: serializeOutputReviewStatus(output.reviewStatus),
    });
  } catch (error) {
    console.error("Failed to fetch output review status:", error);
    return NextResponse.json(
      { error: "Failed to fetch output review status" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();
  try {
    const { id } = await params;
    const body = (await request.json()) as { reviewStatus?: unknown };
    const result = await withLockedAutomationRecords(async (records, transaction) => {
      assertAssetsAreNotPublicationLeased(records, [id]);
      const updated = await updateOutputReviewStatus({
        outputId: id,
        reviewStatus: body.reviewStatus,
        update: (outputId, reviewStatus) =>
          transaction.generatedFile.update({
            where: { id: outputId },
            data: { reviewStatus },
            select: { id: true, reviewStatus: true },
          }),
      });
      return { result: updated };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnresolvedPublicationConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof OutputReviewStatusError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    console.error("Failed to update output review status:", error);
    return NextResponse.json(
      { error: "Failed to update output review status" },
      { status: 500 }
    );
  }
}
