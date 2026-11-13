import type { AutomationPublication, AutomationRecord } from "@/lib/automations";
import { statusLabel } from "./hub-status";

export type HubTone = "ok" | "warn" | "bad" | "neutral";

export function automationListStatusTone(
  needsAttention: boolean,
  scheduleActive: boolean
): HubTone {
  if (needsAttention) return "warn";
  return scheduleActive ? "ok" : "neutral";
}

export function automationListStatusLabel(
  record: AutomationRecord,
  needsAttention: boolean
) {
  return needsAttention ? "Needs attention" : statusLabel(record);
}

export function publicationStatusHeadline(publication: AutomationPublication) {
  if (publication.status === "pending") return "Preparing secure handoff";
  if (publication.status === "submitted") return "Provider processing";
  if (publication.status === "published") return "Provider published";
  return "Publish failed";
}

export function publicationStatusTone(publication: AutomationPublication): HubTone {
  if (publication.status === "failed") return "bad";
  if (publication.status === "published") return "ok";
  return "warn";
}

export function weekRangeLabel(weekDates: readonly Date[]) {
  const first = weekDates[0];
  const last = weekDates[weekDates.length - 1];
  const month = (date: Date) => date.toLocaleDateString([], { month: "short" });
  return first.getMonth() === last.getMonth()
    ? `${first.getDate()} to ${last.getDate()} ${month(last)}`
    : `${first.getDate()} ${month(first)} to ${last.getDate()} ${month(last)}`;
}

export function slideshowNextRunLabel(input: {
  active: boolean;
  nextRunAt: string | null | undefined;
}) {
  if (!input.active) return "Paused";
  if (!input.nextRunAt) return "Not scheduled";
  return new Date(input.nextRunAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
