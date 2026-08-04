import { NextResponse } from "next/server";
import { generateImage } from "@/lib/ai/generate-image";
import {
  AutomationReviewValidationError,
  runAutomationReviewDraft,
} from "@/lib/automation-review";
import { isAutomationRecord, type AutomationRecord } from "@/lib/automations";
import {
  isSameOriginMutation,
  noStoreJson,
  rejectCrossOriginMutation,
} from "@/lib/integrations/routes";
import {
  readWorkspaceFeatureRecords,
  updateWorkspaceFeatureRecords,
} from "@/lib/workspace-feature-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  try {
    const { id } = await params;
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) {
      return noStoreJson({ error: "Automation id is invalid" }, { status: 400 });
    }

    const records = await readWorkspaceFeatureRecords<AutomationRecord>(
      "automations"
    );
    const automation = records.find(
      (candidate) => candidate.id === id && isAutomationRecord(candidate)
    );
    if (!automation) {
      return noStoreJson({ error: "Automation was not found" }, { status: 404 });
    }

    const result = await runAutomationReviewDraft(automation, {
      generate: (generationRequest, options) =>
        generateImage(generationRequest, undefined, options),
      markAccepted: async (automationId, acceptedAt, jobId) => {
        const updatedRecords =
          await updateWorkspaceFeatureRecords<AutomationRecord>(
            "automations",
            (currentRecords) =>
              currentRecords.map((record) =>
                record.id === automationId && isAutomationRecord(record)
                  ? {
                      ...record,
                      lastRunAt: acceptedAt,
                      scheduler: {
                        ...record.scheduler,
                        lastJobId: jobId,
                        lastError: null,
                        lastErrorAt: null,
                      },
                      updatedAt: acceptedAt,
                    }
                  : record
              )
          );
        return (
          updatedRecords.find(
            (record) =>
              record.id === automationId && isAutomationRecord(record)
          ) ?? null
        );
      },
    });

    return noStoreJson(
      {
        id: result.jobId,
        status: "queued",
        type: "image",
        model: "nano-banana-2",
        createdAt: result.acceptedAt,
        automation: result.automation,
        reviewRequired: true,
        publishingStarted: false,
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof AutomationReviewValidationError) {
      return noStoreJson({ error: error.message }, { status: 422 });
    }
    console.error(
      "Failed to create automation review draft:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return NextResponse.json(
      { error: "Failed to submit the review draft" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
