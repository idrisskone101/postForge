"use client";

import { Button, Icon, SplitMeter, type MeterPart } from "@/components/workbench";
import { DAYS, automationNeedsAttention } from "./hub-status";
import type { AutomationsWorkspace } from "./use-automations-workspace";

export function HubOverview({ hub }: { hub: AutomationsWorkspace }) {
  const {
    records,
    readyPlanCount,
    attentionCount,
    scheduledDays,
    integrationStatuses,
    integrationsLoading,
    integrationsError,
    setFilter,
    load,
  } = hub;
  const blockedDays = new Set(
    records
      .filter((record) =>
        automationNeedsAttention(record, integrationStatuses, integrationsLoading)
      )
      .flatMap((record) => record.schedule.days)
  );
  const plannedDays = new Set(records.flatMap((record) => record.schedule.days));
  const planParts: MeterPart[] = records.map((_, index) => ({
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
      <section className="wb-stat-strip min-w-0 flex-1 flex-wrap gap-y-4">
        <RatioStat
          label="Ready plans"
          value={readyPlanCount}
          total={records.length}
          meter={
            <SplitMeter
              equal
              className="w-[120px] max-w-full"
              label={`${readyPlanCount} of ${records.length} plans ready`}
              parts={planParts.slice(0, 12)}
            />
          }
        />
        <RatioStat
          label="Planned days"
          value={scheduledDays}
          total={DAYS.length}
          meter={
            <SplitMeter
              equal
              className="w-[168px] max-w-full"
              label={`${scheduledDays} of 7 days planned, ${blockedDays.size} need attention`}
              parts={dayParts}
            />
          }
        />
      </section>
      {integrationsError ? (
        <AttentionNote
          title="Connection status unavailable"
          detail={integrationsError}
          action="Check again"
          onAction={load}
        />
      ) : attentionCount > 0 && firstBlocked ? (
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

function RatioStat({
  label,
  value,
  total,
  meter,
}: {
  label: string;
  value: number;
  total: number;
  meter: React.ReactNode;
}) {
  return (
    <div className="wb-stat">
      <span className="wb-label">{label}</span>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <span className="wb-stat-value">{value}</span>
        <span className="text-[16px] font-semibold leading-[18px] text-fg-muted">/ {total}</span>
        <span className="flex min-w-0 max-w-full self-center sm:ml-2">{meter}</span>
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
