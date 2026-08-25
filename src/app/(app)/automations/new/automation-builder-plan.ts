import {
  automationStatusAfterReview,
  createAutomationRecord,
  isAutomationSocialDestination,
  resolveAutomationDestination,
  type AutomationDestination,
  type AutomationRecord,
} from "@/lib/automations";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";

export function applyPlaybookToRecord(
  current: AutomationRecord,
  templateId: string
): AutomationRecord {
  const next = createAutomationRecord(templateId);
  return {
    ...next,
    id: current.id,
    createdAt: current.createdAt,
    destination: current.destination,
    accountId: current.accountId ?? null,
    accountLabel: current.accountLabel,
    approvalRequired: current.approvalRequired,
    schedule: current.schedule,
    content: {
      ...next.content,
      collectionId: current.content.collectionId,
      sourceFileId: current.content.sourceFileId ?? null,
    },
  };
}

export function destinationSelectionPatch(
  current: AutomationRecord,
  destination: AutomationDestination,
  integrationStatuses: readonly PublicIntegrationStatus[]
): Pick<
  AutomationRecord,
  "destination" | "accountId" | "accountLabel" | "approvalRequired"
> {
  const readiness = resolveAutomationDestination(destination, integrationStatuses);
  return {
    destination,
    accountId: readiness.accountId,
    accountLabel: readiness.accountLabel,
    approvalRequired: isAutomationSocialDestination(destination)
      ? true
      : current.approvalRequired,
  };
}

export function preparePlanSave({
  record,
  mode,
  integrationStatuses,
}: {
  record: AutomationRecord;
  mode: "draft" | "create";
  integrationStatuses: readonly PublicIntegrationStatus[];
}): { ok: true; record: AutomationRecord } | { ok: false; error: string } {
  if (!record.name.trim()) {
    return { ok: false, error: "Give this automation a name before saving." };
  }
  if (record.schedule.days.length === 0) {
    return { ok: false, error: "Choose at least one schedule day." };
  }
  if (
    mode === "create" &&
    isAutomationSocialDestination(record.destination) &&
    !record.approvalRequired
  ) {
    return {
      ok: false,
      error: "Social automations require approval before any publishing step.",
    };
  }

  const readiness = resolveAutomationDestination(
    record.destination,
    integrationStatuses,
    isAutomationSocialDestination(record.destination)
      ? (record.accountId ?? null)
      : undefined
  );
  const nextStatus =
    mode === "draft"
      ? "draft"
      : automationStatusAfterReview(record.destination, integrationStatuses, {
          approvalRequired: record.approvalRequired,
          accountId: record.accountId ?? null,
        });

  return {
    ok: true,
    record: {
      ...record,
      name: record.name.trim(),
      status: nextStatus,
      executionEnabled: false,
      accountId:
        record.destination === "manual" ? null : record.accountId ?? null,
      accountLabel:
        record.destination === "manual"
          ? null
          : readiness.ready
            ? readiness.accountLabel
            : record.accountLabel,
      updatedAt: new Date().toISOString(),
    },
  };
}
