import type { AutomationRecord } from "@/lib/automations";
import {
  manuallyResolveUnknownPublication,
  recoverStalePendingPublication,
} from "@/lib/automation-publishing";
import { noStoreJson } from "@/lib/http";
import { updateWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";
import type { PublishBody } from "./publish-settings";

export async function resolveAutomationPublicationOutcome(input: {
  id: string;
  automation: AutomationRecord;
  body: PublishBody;
}) {
  const { id, automation, body } = input;
  const publication = automation.publication;
  if (
    !publication ||
    body.consent !== true ||
    (body.resolution !== "published" && body.resolution !== "not_published")
  ) {
    return noStoreJson(
      { error: "Explicit confirmation and a verified provider outcome are required" },
      { status: 422 }
    );
  }
  let resolved: ReturnType<typeof manuallyResolveUnknownPublication> | null = null;
  await updateWorkspaceFeatureRecords<AutomationRecord>(
    "automations",
    (records) => {
      resolved = manuallyResolveUnknownPublication(records, {
        automationId: id,
        attemptId: publication.attemptId,
        resolution: body.resolution as "published" | "not_published",
        now: new Date().toISOString(),
      });
      return resolved.records;
    }
  );
  const result = resolved as ReturnType<
    typeof manuallyResolveUnknownPublication
  > | null;
  if (!result?.publication) throw new Error("Manual resolution was not persisted");
  return noStoreJson({ publication: result.publication });
}

export async function recoverStaleAutomationPublication(input: {
  id: string;
  automation: AutomationRecord;
}) {
  const { id, automation } = input;
  const publication = automation.publication;
  if (!publication) {
    return noStoreJson(
      { error: "This automation has no publication attempt to recover" },
      { status: 409 }
    );
  }
  let recovered: ReturnType<typeof recoverStalePendingPublication> | null = null;
  await updateWorkspaceFeatureRecords<AutomationRecord>(
    "automations",
    (records) => {
      recovered = recoverStalePendingPublication(records, {
        automationId: id,
        attemptId: publication.attemptId,
        now: new Date().toISOString(),
      });
      return recovered.records;
    }
  );
  const result = recovered as ReturnType<
    typeof recoverStalePendingPublication
  > | null;
  if (!result?.publication) throw new Error("Recovery was not persisted");
  return noStoreJson({ publication: result.publication });
}
