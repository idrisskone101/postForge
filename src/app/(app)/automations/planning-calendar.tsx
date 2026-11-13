"use client";

import { Panel } from "@/components/workbench";
import { cn } from "@/lib/utils";
import { DAYS, currentWeekDates, localDateKey } from "./hub-status";
import { weekRangeLabel } from "./hub-visual";
import type { AutomationsWorkspace } from "./use-automations-workspace";

export function PlanningCalendar({ hub }: { hub: AutomationsWorkspace }) {
  const { calendarEntries } = hub;
  const weekDates = currentWeekDates();
  const todayKey = localDateKey(new Date());

  return (
    <Panel
      pad="none"
      className="shrink-0 p-5 [&>.wb-panel-head]:h-9"
      title="Planning calendar"
      action={
        <span className="inline-flex h-9 items-center rounded-[var(--pf-radius-pill)] bg-raised px-3.5 text-[13px] font-semibold leading-4 text-fg">
          {weekRangeLabel(weekDates)}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {DAYS.map((day, index) => {
          const matching = calendarEntries.filter((entry) => entry.days.includes(day));
          const date = weekDates[index];
          const isToday = localDateKey(date) === todayKey;
          return (
            <div
              key={day}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex min-h-[108px] min-w-0 flex-col gap-2.5 rounded-lg bg-raised p-3",
                isToday && "shadow-[0_0_0_2px_var(--pf-ember)]"
              )}
            >
              <p className="text-[14px] font-bold leading-[18px] text-fg" title={date.toLocaleDateString()}>
                {day} {date.getDate()}
              </p>
              {matching.slice(0, VISIBLE_PER_DAY).map((entry) => (
                <div key={entry.id} className="flex min-w-0 flex-col gap-0.5">
                  <span className="wb-mono text-fg-muted">{entry.time}</span>
                  <span className="line-clamp-2 break-words text-[13px] font-semibold leading-[17px] text-fg" title={entry.name}>
                    {entry.name}
                  </span>
                  {entry.needsAttention ? (
                    <span className="text-[12px] font-semibold leading-4 text-warn">
                      Needs attention
                    </span>
                  ) : null}
                </div>
              ))}
              {matching.length > VISIBLE_PER_DAY ? (
                <span className="text-[12px] leading-4 text-fg-secondary">
                  {matching.length - VISIBLE_PER_DAY} more
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const VISIBLE_PER_DAY = 2;
