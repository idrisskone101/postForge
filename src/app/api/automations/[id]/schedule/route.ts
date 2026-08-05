import {
  AutomationReviewValidationError,
  validateAutomationReviewDraftSpec,
} from "@/lib/automation-review";
import { validateAutomationSchedule } from "@/lib/automation-schedule";
import {
  createAutomationSchedulerState,
  isAutomationRecord,
  type AutomationRecord,
} from "@/lib/automations";
import {
  isSameOriginMutation,
  noStoreJson,
  rejectCrossOriginMutation,
} from "@/lib/integrations/routes";
import { updateWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";

type ScheduleAction = "activate" | "pause";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) {
    return noStoreJson({ error: "Automation id is invalid" }, { status: 400 });
  }

  let body: { action?: unknown };
  try {
    body = (await request.json()) as { action?: unknown };
  } catch {
    return noStoreJson({ error: "A JSON request body is required" }, { status: 400 });
  }
  if (body.action !== "activate" && body.action !== "pause") {
    return noStoreJson(
      { error: "action must be activate or pause" },
      { status: 400 }
    );
  }
  const action: ScheduleAction = body.action;
  const now = new Date().toISOString();
  const outcome: {
    automation: AutomationRecord | null;
    error: string | null;
    status: number;
  } = { automation: null, error: null, status: 200 };

  try {
    const records = await updateWorkspaceFeatureRecords<AutomationRecord>(
      "automations",
      (current) =>
        current.map((candidate) => {
          if (candidate.id !== id) return candidate;
          if (!isAutomationRecord(candidate)) {
            outcome.error = "Automation record is invalid";
            outcome.status = 422;
            return candidate;
          }

          if (action === "activate") {
            if (candidate.destination !== "manual") {
              outcome.error =
                "Local scheduling is only available for the Review queue. Automatic social scheduling is unavailable; publish approved videos through the explicit provider review.";
              outcome.status = 409;
              return candidate;
            }
            const scheduleError = validateAutomationSchedule(candidate.schedule);
            if (scheduleError) {
              outcome.error = scheduleError;
              outcome.status = 422;
              return candidate;
            }
            try {
              validateAutomationReviewDraftSpec(candidate);
            } catch (error) {
              outcome.error =
                error instanceof AutomationReviewValidationError
                  ? error.message
                  : "Automation review draft settings are invalid";
              outcome.status = 422;
              return candidate;
            }
          }

          outcome.automation = {
            ...candidate,
            status: action === "activate" ? "active" : "paused",
            executionEnabled: action === "activate",
            scheduler:
              candidate.scheduler ?? createAutomationSchedulerState(),
            updatedAt: now,
          };
          return outcome.automation;
        })
    );

    if (outcome.error) {
      return noStoreJson({ error: outcome.error }, { status: outcome.status });
    }
    if (!outcome.automation) {
      return noStoreJson({ error: "Automation was not found" }, { status: 404 });
    }
    return noStoreJson({ automation: outcome.automation, records });
  } catch (error) {
    console.error(
      "Failed to update automation schedule:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return noStoreJson(
      { error: "Failed to update the local schedule" },
      { status: 500 }
    );
  }
}
