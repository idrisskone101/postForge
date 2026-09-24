import { NextRequest, NextResponse } from "next/server";
import {
  parsePhoneCompositeForm,
  parsePhoneCompositeJson,
  PhoneCompositeRequestError,
} from "@/lib/phone-composite/request";
import { createPhoneCompositeJob } from "@/lib/phone-composite/run";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const parsed = await readPhoneCompositeRequest(request);
    const result = await createPhoneCompositeJob(parsed);
    return NextResponse.json(
      {
        id: result.jobId,
        fileId: result.fileId,
        status: "completed",
        model: "phone-composite",
        estimatedCost: 0,
        width: result.width,
        height: result.height,
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PhoneCompositeRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Phone screenshot composite error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to composite the screenshot onto the phone",
      },
      { status: 500 },
    );
  }
}

async function readPhoneCompositeRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return parsePhoneCompositeForm(await request.formData());
  }
  try {
    return parsePhoneCompositeJson(await request.json());
  } catch (error) {
    if (error instanceof PhoneCompositeRequestError) throw error;
    throw new PhoneCompositeRequestError("Request body must be valid JSON");
  }
}
