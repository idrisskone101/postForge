"use client";

import { Button, Icon, SplitMeter, type MeterPart } from "@/components/workbench";
import { DAYS, automationNeedsAttention } from "./hub-status";
import type { AutomationsWorkspace } from "./use-automations-workspace";

export function HubOverview({ hub }: { hub: AutomationsWorkspace }) {
  const {
    records,
    readyPlanCount,
    planCount,
    attentionCount,
    calendarEntries,
    integrationStatuses,
    integrationsLoading,
    setFilter,
    error,
  } = hub;
  const unavailable = Boolean(error);
  const blockedDays = new Set(
    calendarEntries.filter((entry) => entry.needsAttention).flatMap((entry) => entry.days)
  );
  const plannedDays = new Set(
    calendarEntries.flatMap((entry) => entry.days).filter((day) => DAYS.includes(day))
  );
  const scheduledDays = plannedDays.size;
  const planParts: MeterPart[] = Array.from({ length: planCount }, (_, index) => ({
    value: 1,
    tone: index < readyPlanCount ? "neutral" : "empty",
  }));
  const dayParts: MeterPart[] = DAYS.map((day) => ({
    value: 1,
    tone: blockedDays.has(day) ? "warn" : plannedDays.has(day) ? "neutral" : "empty",
    label: day,
  }));
  const firstBlocked = records.find((record) =>
    automationNeedsAttention(record, integrationStatuses, integrationsLoading)
  );

  return (
    <div className="flex shrink-0 flex-col gap-3 lg:flex-row">
      <section className={STAT_STRIP_CLASS}>
        <RatioStat
          label="Ready plans"
          value={unavailable ? null : readyPlanCount}
          total={planCount}
          meter={
            <SplitMeter
              equal
              className="w-full max-w-[120px] gap-[3px]"
              label={`${readyPlanCount} of ${planCount} plans ready`}
              parts={planParts.slice(0, 12)}
            />
          }
        />
        <RatioStat
          label="Planned days"
          value={unavailable ? null : scheduledDays}
          total={DAYS.length}
          meter={
            <SplitMeter
              equal
              className="w-full max-w-[168px] gap-[3px]"
              label={`${scheduledDays} of 7 days planned, ${blockedDays.size} need attention`}
              parts={dayParts}
            />
          }
        />
      </section>
      {attentionCount > 0 && firstBlocked ? (
        <AttentionNote
          title={
            attentionCount === 1
              ? "1 plan needs attention"
              : `${attentionCount} plans need attention`
          }
          detail={firstBlocked.name}
          action="Review"
          onAction={() => setFilter("Needs attention")}
        />
      ) : null}
    </div>
  );
}

/** Below 640px the two stats stack with a hairline between them and draw no meter (Paper "09 Automations / 390"). */
const STAT_STRIP_CLASS = [
  "wb-stat-strip min-w-0 flex-1 flex-wrap gap-y-4 sm:[&>.wb-stat:last-child]:pr-6",
  "max-sm:flex-col max-sm:flex-nowrap max-sm:[&>.wb-stat]:flex-none max-sm:[&>.wb-stat]:px-0",
  "max-sm:[&>.wb-stat+.wb-stat]:border-t max-sm:[&>.wb-stat+.wb-stat]:border-l-0 max-sm:[&>.wb-stat+.wb-stat]:pt-4",
].join(" ");

function RatioStat({
  label,
  value,
  total,
  meter,
}: {
  label: string;
  value: number | null;
  total: number;
  meter: React.ReactNode;
}) {
  return (
    <div className="wb-stat">
      <span className="wb-label">{label}</span>
      <div className="flex min-w-0 items-baseline gap-x-2">
        <span className="wb-stat-value">{value ?? "-"}</span>
        {value === null ? null : (
          <>
            <span className="text-[16px] font-semibold leading-[18px] text-fg-muted">/ {total}</span>
            <span className="ml-2 flex min-w-14 flex-1 self-center max-sm:hidden">{meter}</span>
          </>
        )}
      </div>
    </div>
  );
}

function AttentionNote({
  title,
  detail,
  action,
  onAction,
}: {
  title: string;
  detail: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <section
      role="status"
      className="flex shrink-0 items-center gap-3.5 rounded-xl bg-panel p-5 shadow-panel lg:w-[400px]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-warn-tint text-warn">
        <Icon name="alert" size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold leading-5 text-fg">{title}</p>
        <p className="truncate text-[13px] leading-[18px] text-fg-muted" title={detail}>
          {detail}
        </p>
      </div>
      <Button variant="strong" className="h-[34px] px-3.5" onClick={onAction}>
        {action}
      </Button>
    </section>
  );
}
