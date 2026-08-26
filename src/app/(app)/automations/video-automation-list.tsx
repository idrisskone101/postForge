"use client";

import { Loader2, MoreHorizontal, Workflow } from "lucide-react";
import { isAutomationExecutionEnabled } from "@/lib/automations";
import { AutomationDestinationCell } from "./destination-cell";
import { FILTERS, automationNeedsAttention } from "./hub-status";
import {
  automationListStatusClass,
  automationListStatusLabel,
  filterPillClass,
} from "./hub-visual";
import { publicationActionState } from "./publication-actions";
import { PublicationStatus } from "./publication-status";
import type { AutomationsWorkspace } from "./use-automations-workspace";
import { VideoAutomationMenu } from "./video-automation-menu";

export function VideoAutomationList({
  hub,
}: {
  hub: AutomationsWorkspace;
}) {
  const {
    filtered,
    filter,
    setFilter,
    attentionCount,
    integrationStatuses,
    integrationsLoading,
    menu,
    setMenu,
    busy,
    changeLocalSchedule,
    generateReviewDraft,
    openPublishReview,
    refreshPublication,
    recoverPendingPublication,
    setManualResolutionDialog,
    duplicate,
    remove,
  } = hub;

  return (
    <section className="pf-card mt-3 overflow-visible p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="pf-section-title mt-1">Your automations</h2>
          <p className="mt-1 max-w-[560px] min-w-0 break-words text-[12px] leading-4 text-[var(--pf-muted)] [overflow-wrap:anywhere]">
            Manual Review queue plans can generate real image drafts on their saved local schedule after you activate them. Social plans never auto-publish: each approved Gallery video requires a separate provider review and explicit confirmation.
          </p>
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-[8px] bg-[var(--pf-active)] p-1">
          {FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={filterPillClass(filter === item)}
            >
              {item}
              {item === "Needs attention" && attentionCount > 0 && (
                <span className="ml-1 rounded-full bg-[var(--pf-orange)] px-1.5 py-0.5 text-[11px] text-white">
                  {attentionCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 hidden grid-cols-[1.5fr_1fr_1fr_.8fr_28px] gap-3 px-2 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--pf-muted)] md:grid">
        <span>Automation</span>
        <span>Destination</span>
        <span>Cadence</span>
        <span>Status</span>
        <span />
      </div>

      {filtered.length === 0 ? (
        <div className="py-14 text-center">
          <Workflow className="mx-auto size-7 text-[var(--pf-muted)]" />
          <h3 className="mt-2 text-[13px] font-semibold text-[var(--pf-ink)]">
            No automations in this filter
          </h3>
          <p className="mt-1 text-[11px] text-[var(--pf-muted)]">Try All or create another workflow.</p>
        </div>
      ) : (
        <div>
          {filtered.map((record) => {
            const needsAttention = automationNeedsAttention(
              record,
              integrationStatuses,
              integrationsLoading
            );
            const scheduleActive =
              record.status === "active" && isAutomationExecutionEnabled(record);
            const canControlLocalSchedule =
              record.destination === "manual" || scheduleActive;
            const actionState = publicationActionState(record);

            return (
              <article
                key={record.id}
                className="relative grid min-w-0 gap-3 border-t border-[var(--pf-border)] px-2 py-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,.8fr)_28px] md:items-center hover:bg-[var(--pf-active)]/40"
              >
                <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-2">
                  <span className="grid size-10 place-items-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] text-[var(--pf-muted)]">
                    <Workflow className="size-4 shrink-0" />
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-[13px] font-semibold text-[var(--pf-ink)]">{record.name}</b>
                    <small className="mt-1 block truncate text-[12px] text-[var(--pf-muted)]">
                      {record.content.slideCount} slides · {record.template.replaceAll("-", " ")}
                    </small>
                  </span>
                </div>

                <AutomationDestinationCell
                  record={record}
                  providers={integrationStatuses}
                  loading={integrationsLoading}
                />

                <div className="min-w-0 break-words text-[11px] text-[var(--pf-muted)] [overflow-wrap:anywhere]">
                  <span>
                    {record.schedule.days.join(", ")} · {record.schedule.time}
                  </span>
                  <small className="mt-1 block text-[11px] text-[var(--pf-muted)]">
                    {record.schedule.timezone}
                  </small>
                  {record.lastRunAt && (
                    <small className="mt-1 block text-[11px] text-[var(--pf-muted)]">
                      Draft queued {new Date(record.lastRunAt).toLocaleDateString()}
                    </small>
                  )}
                  {record.scheduler?.lastJobId && (
                    <small className="mt-1 block min-w-0 break-words font-mono text-[11px] text-[var(--pf-muted)] [overflow-wrap:anywhere]">
                      Job {record.scheduler.lastJobId}
                    </small>
                  )}
                  {record.scheduler?.lastError && (
                    <small
                      role="alert"
                      className="mt-1 block min-w-0 break-words text-[11px] leading-3 text-[var(--pf-danger)] [overflow-wrap:anywhere]"
                    >
                      {record.scheduler.lastError}
                    </small>
                  )}
                </div>

                <div className="min-w-0">
                  <span className={automationListStatusClass(needsAttention, scheduleActive)}>
                    {automationListStatusLabel(record, needsAttention)}
                  </span>
                  {record.publication && <PublicationStatus publication={record.publication} />}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setMenu(menu === record.id ? null : record.id)}
                    className="grid size-7 place-items-center rounded-[8px] hover:bg-[var(--pf-active)]"
                    aria-label={`Actions for ${record.name}`}
                  >
                    <MoreHorizontal className="size-4 shrink-0" />
                  </button>
                  {menu === record.id && (
                    <VideoAutomationMenu
                      menu={{
                        record,
                        scheduleActive,
                        canControlLocalSchedule,
                        pendingRecoverable: actionState.pendingRecoverable,
                        canRefreshPublication: actionState.canRefreshPublication,
                        failedReconciliationStage: actionState.failedReconciliationStage,
                        manualOutcomeStage: actionState.manualOutcomeStage,
                        manualOutcomeResolvable: actionState.manualOutcomeResolvable,
                        negativeOutcomeResolvable: actionState.negativeOutcomeResolvable,
                        onChangeLocalSchedule: () =>
                          changeLocalSchedule(record, scheduleActive ? "pause" : "activate"),
                        onGenerateReviewDraft: () => generateReviewDraft(record),
                        onOpenPublishReview: () => openPublishReview(record),
                        onRefreshPublication: () => refreshPublication(record),
                        onRecoverPendingPublication: () => recoverPendingPublication(record),
                        onSetManualResolutionDialog: setManualResolutionDialog,
                        onDuplicate: () => duplicate(record),
                        onRemove: () => remove(record),
                      }}
                    />
                  )}
                </div>

                {busy === record.id && (
                  <div className="absolute inset-0 grid place-items-center bg-[var(--pf-surface)]/80">
                    <Loader2 className="size-4 shrink-0 animate-spin text-[var(--pf-orange)]" />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
