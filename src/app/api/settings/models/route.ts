import { NextRequest, NextResponse } from "next/server";
import {
  isModelAvailabilityState,
  MODEL_AVAILABILITY_RECORD_ID,
  readModelAvailability,
  saveModelAvailability,
} from "@/lib/ai/model-availability";
import {
  isSameOriginMutation,
  rejectCrossOriginMutation,
} from "@/lib/integrations/routes";

export async function GET() {
  try {
    const availability = await readModelAvailability();
    return NextResponse.json({ availability });
  } catch (error) {
    console.error("Failed to read model availability:", error);
    return NextResponse.json(
      { error: "Failed to load model availability" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  try {
    const body = (await request.json()) as { availability?: unknown };
    const candidate = {
      ...(body.availability as object),
      id: MODEL_AVAILABILITY_RECORD_ID,
    };
    if (!isModelAvailabilityState(candidate)) {
      return NextResponse.json(
        { error: "availability does not match the model availability shape" },
        { status: 400 }
      );
    }

    const saved = await saveModelAvailability({
      enabledModelIds: candidate.enabledModelIds,
      defaultImageModelId: candidate.defaultImageModelId,
      defaultVideoModelId: candidate.defaultVideoModelId,
    });
    return NextResponse.json({ availability: saved });
  } catch (error) {
    console.error("Failed to save model availability:", error);
    return NextResponse.json(
      { error: "Failed to save model availability" },
      { status: 500 }
    );
  }
}
