import {
  isAutomationExecutionEnabled,
  isAutomationSocialDestination,
  resolveAutomationDestination,
  type AutomationRecord,
} from "@/lib/automations";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";

export const FILTERS = ["All", "Ready plans", "Drafts", "Needs attention"] as const;

export type AutomationHubFilter = (typeof FILTERS)[number];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function statusLabel(record: AutomationRecord) {
  if (record.status === "active") {
    return isAutomationExecutionEnabled(record)
      ? "Local schedule active"
      : "Local schedule off";
  }
  return record.status === "paused"
    ? "Local schedule paused"
    : record.status === "needs_connection"
      ? "Needs connection"
      : record.status[0].toUpperCase() + record.status.slice(1);
}

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function currentWeekDates(now = new Date()) {
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(12, 0, 0, 0);
  return DAYS.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export function automationNeedsAttention(
  record: AutomationRecord,
  providers: readonly PublicIntegrationStatus[],
  integrationsLoading: boolean
) {
  if (
    record.publication?.status === "failed" ||
    record.publication?.status === "pending" ||
    (record.publication?.status === "submitted" && record.publication.error)
  ) {
    return true;
  }
  if (record.scheduler?.lastError) return true;
  if (record.status === "needs_connection") return true;
  if (!isAutomationSocialDestination(record.destination) || integrationsLoading) {
    return false;
  }
  if (!record.approvalRequired) return true;
  return !resolveAutomationDestination(
    record.destination,
    providers,
    record.accountId ?? null
  ).ready;
}
