import type { AutomationPublication, AutomationRecord } from "@/lib/automations";
import { cn } from "@/lib/utils";
import { statusLabel } from "./hub-status";

export function filterPillClass(active: boolean) {
  return cn(
    "h-7 whitespace-nowrap rounded-[8px] px-2 text-[12px] text-[var(--pf-muted)]",
    active &&
      "bg-[var(--pf-surface)] font-semibold text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]"
  );
}

export function calendarDayShellClass(isToday: boolean) {
  return cn(
    "min-h-[96px] min-w-0 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-2",
    isToday && "bg-[var(--sidebar-accent)]"
  );
}

export function calendarTodayMarkerClass(isToday: boolean) {
  return cn(
    "mt-1 grid size-5 place-items-center rounded-full text-[11px]",
    isToday && "bg-[var(--pf-orange)] text-white"
  );
}

export function calendarChipClass(needsAttention: boolean, scheduleActive: boolean) {
  if (needsAttention) {
    return "block truncate rounded-[8px] border-l border-[var(--pf-border)] bg-[var(--pf-danger)]/10 px-1.5 py-1 text-[11px] text-[var(--pf-danger)]";
  }
  if (scheduleActive) {
    return "block truncate rounded-[8px] border-l border-[var(--pf-border)] bg-[var(--pf-success)]/10 px-1.5 py-1 text-[11px] text-[var(--pf-success)]";
  }
  return "block truncate rounded-[8px] border-l border-[var(--pf-border)] bg-[var(--pf-active)] px-1.5 py-1 text-[11px] text-[var(--pf-muted)]";
}

export function automationListStatusClass(
  needsAttention: boolean,
  scheduleActive: boolean
) {
  if (needsAttention) {
    return "pf-status-danger inline-flex max-w-full items-center gap-1 px-2 py-1 text-[11px] font-bold [overflow-wrap:anywhere]";
  }
  if (scheduleActive) {
    return "pf-status-success inline-flex max-w-full items-center gap-1 px-2 py-1 text-[11px] font-bold [overflow-wrap:anywhere]";
  }
  return "inline-flex max-w-full items-center rounded-full border border-[var(--pf-border)] bg-[var(--pf-active)] px-2 py-1 text-[11px] font-medium text-[var(--pf-muted)] [overflow-wrap:anywhere]";
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

export function publicationStatusHeadlineClass(publication: AutomationPublication) {
  if (publication.status === "failed") return "text-[var(--pf-danger)]";
  if (publication.status === "published") return "text-[var(--pf-success)]";
  return "text-[var(--pf-lamp-amber)]";
}

export function publicationStatusPillClass(publication: AutomationPublication) {
  if (publication.status === "failed") return "pf-status-danger";
  if (publication.status === "published") return "pf-status-success";
  return "pf-status-warning";
}

export function slideshowStatusPillClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[12px] font-bold",
    active ? "pf-status-success" : "bg-[var(--pf-active)] text-[var(--pf-muted)]"
  );
}

export function slideshowStatusDotClass(active: boolean) {
  return cn(
    "size-1.5 rounded-full",
    active ? "bg-[var(--pf-success)]" : "bg-[var(--pf-border-strong)]"
  );
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
