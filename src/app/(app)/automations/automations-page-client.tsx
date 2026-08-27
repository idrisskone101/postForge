"use client";

import Link from "next/link";
import {
  CalendarDays,
  Check,
  CircleAlert,
  Plus,
  RefreshCw,
  Workflow,
} from "lucide-react";
import {
  isAutomationExecutionEnabled,
  type AutomationRecord,
} from "@/lib/automations";
import {
  DAYS,
  automationNeedsAttention,
  currentWeekDates,
  localDateKey,
} from "./hub-status";
import {
  calendarChipClass,
  calendarDayShellClass,
  calendarTodayMarkerClass,
} from "./hub-visual";
import { ManualResolutionDialog } from "./manual-resolution-dialog";
import { Metric } from "./metric";
import { PublishReviewDialog } from "./publish-review-dialog";
import { SlideshowAutomationList } from "./slideshow-automation-list";
import { useAutomationsWorkspace } from "./use-automations-workspace";
import { VideoAutomationList } from "./video-automation-list";

export function AutomationsPageClient({
  initialRecords,
}: {
  initialRecords: AutomationRecord[];
}) {
  const hub = useAutomationsWorkspace(initialRecords);
  const {
    records,
    error,
    integrationsError,
    integrationStatuses,
    integrationsLoading,
    toast,
    publishDialog,
    setPublishDialog,
    manualResolutionDialog,
    setManualResolutionDialog,
    load,
    submitPublication,
    resolveUnknownPublication,
    readyPlanCount,
    attentionCount,
    activeScheduleCount,
    scheduledDays,
    busy,
  } = hub;

  const weekDates = currentWeekDates();
  const todayKey = localDateKey(new Date());

  return (
    <div data-page-inset="true" className="px-5 py-5 sm:px-7 lg:px-8">
      {error && (
        <div
          role="alert"
          className="mb-4 grid min-w-0 grid-cols-[28px_minmax(0,1fr)] items-center gap-2 rounded-[8px] border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)] sm:grid-cols-[28px_minmax(0,1fr)_auto]"
        >
          <CircleAlert className="size-4 shrink-0" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span>
          <button onClick={load} className="pf-button-secondary col-span-2 shrink-0 !min-h-8 sm:col-span-1">
            <RefreshCw className="size-3 shrink-0" /> Retry
          </button>
        </div>
      )}

      {integrationsError && (
        <div
          role="alert"
          className="mb-4 grid min-w-0 grid-cols-[28px_minmax(0,1fr)] items-center gap-2 rounded-[8px] border border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10 px-3 py-2 text-[11px] text-[var(--pf-lamp-amber)] sm:grid-cols-[28px_minmax(0,1fr)_auto]"
        >
          <CircleAlert className="size-4 shrink-0" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            <b className="block text-[11px]">Live social connection status is unavailable</b>
            <small className="mt-0.5 block min-w-0 break-words text-[12px] [overflow-wrap:anywhere]">
              {integrationsError}. Social automations remain visibly gated; no connection is assumed.
            </small>
          </span>
          <button onClick={load} className="pf-button-secondary col-span-2 shrink-0 !min-h-8 sm:col-span-1">
            <RefreshCw className="size-3 shrink-0" /> Check again
          </button>
        </div>
      )}

      {records.length === 0 ? (
        <section className="pf-card pf-empty-stage flex min-h-[650px] min-w-0 flex-col items-center justify-start p-6 text-center">
          <div data-empty-deco="true" className="relative h-36 w-full min-w-0 max-w-72">
            <div data-empty-icon="true" className="absolute inset-0 grid place-items-center">
              <div className="grid size-14 place-items-center rounded-[8px] bg-[var(--pf-active)] text-[var(--pf-muted)]">
                <Workflow className="size-6" />
              </div>
            </div>
          </div>

          <h2
            data-empty-heading="true"
            data-empty-title="Build your first reviewed content plan"
          >
            <span className="sr-only">Build your first reviewed content plan</span>
          </h2>
          <p className="sr-only">
            Choose a playbook and save a schedule. Manual plans can create local review drafts; connected social plans can publish an approved Gallery video only after a separate review and explicit confirmation.
          </p>
          <p
            aria-hidden="true"
            data-empty-copy="Choose a playbook and save a schedule. Manual plans can create local review drafts; connected social plans can publish an approved Gallery video only after a separate review and explicit confirmation."
          />

          <Link href="/automations/new" data-empty-actions="true" className="pf-button-primary mt-5">
            <Plus className="size-3.5 shrink-0" /> Create a content plan
          </Link>

          <div className="mt-7 max-w-full rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-4 py-3 text-left text-[11px] text-[var(--pf-muted)]">
            <span>
              <i className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-[var(--pf-active)] not-italic text-[var(--pf-ink)]">
                1
              </i>
              Pick a playbook
            </span>
            <span className="mt-2 block sm:mt-0 sm:inline sm:ml-6">
              <i className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-[var(--pf-active)] not-italic text-[var(--pf-ink)]">
                2
              </i>
              Choose a destination
            </span>
            <span className="mt-2 block sm:mt-0 sm:inline sm:ml-6">
              <i className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-[var(--pf-active)] not-italic text-[var(--pf-ink)]">
                3
              </i>
              Save approval rules
            </span>
          </div>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <Metric
              label="Ready plans"
              value={String(readyPlanCount)}
              detail={`${activeScheduleCount} local schedule${activeScheduleCount === 1 ? "" : "s"} active`}
              tone="success"
            />
            <Metric
              label="Saved workflows"
              value={String(records.length)}
              detail={`${records.filter((record) => record.status === "draft").length} drafts`}
            />
            <Metric
              label="Planned days"
              value={String(scheduledDays)}
              detail="Across the current week"
            />
            <Metric
              label="Requires attention"
              value={String(attentionCount)}
              detail={attentionCount ? "Review schedule or connection" : "Everything is configured"}
              tone={attentionCount ? "danger" : "success"}
            />
          </section>

          <section className="pf-card mt-3 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="pf-section-title mt-1">Planning calendar</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pf-active)] px-2.5 py-1 text-[12px] text-[var(--pf-muted)]">
                <CalendarDays className="size-3" /> Local review schedule
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {DAYS.map((day, index) => {
                const matching = records.filter((record) => record.schedule.days.includes(day));
                const date = weekDates[index];
                const isToday = localDateKey(date) === todayKey;
                return (
                  <div key={day} className={calendarDayShellClass(isToday)}>
                    <b className="block truncate text-[12px] uppercase text-[var(--pf-muted)]">{day}</b>
                    <span
                      title={date.toLocaleDateString()}
                      className={calendarTodayMarkerClass(isToday)}
                    >
                      {date.getDate()}
                    </span>
                    <div className="mt-2 space-y-1">
                      {matching.slice(0, 2).map((record) => {
                        const needsAttention = automationNeedsAttention(
                          record,
                          integrationStatuses,
                          integrationsLoading
                        );
                        const scheduleActive =
                          isAutomationExecutionEnabled(record) && record.status === "active";
                        return (
                          <span
                            key={record.id}
                            className={calendarChipClass(needsAttention, scheduleActive)}
                          >
                            {record.schedule.time} · {record.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <VideoAutomationList hub={hub} />
        </>
      )}

      {records.length > 0 ? <SlideshowAutomationList hub={hub} /> : null}

      {toast && (
        <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-[8px] bg-foreground px-3 py-2.5 text-[12px] font-medium text-white shadow-[var(--pf-shadow-lg)] sm:left-auto sm:max-w-[420px]">
          <Check className="size-3.5 shrink-0 text-[var(--pf-success)]" />
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{toast}</span>
        </div>
      )}

      {publishDialog && (
        <PublishReviewDialog
          state={publishDialog}
          busy={busy === publishDialog.recordId}
          onChange={(next) => setPublishDialog({ ...next, error: null })}
          onClose={() => setPublishDialog(null)}
          onPublish={submitPublication}
        />
      )}

      {manualResolutionDialog && (
        <ManualResolutionDialog
          state={manualResolutionDialog}
          busy={busy === manualResolutionDialog.record.id}
          onClose={() => setManualResolutionDialog(null)}
          onConfirm={() =>
            resolveUnknownPublication(
              manualResolutionDialog.record,
              manualResolutionDialog.resolution
            )
          }
        />
      )}
    </div>
  );
}
