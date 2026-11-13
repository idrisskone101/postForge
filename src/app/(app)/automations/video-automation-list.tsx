"use client";

import Link from "next/link";
import {
  EmptyState,
  Segmented,
  StatusChip,
  buttonClass,
} from "@/components/workbench";
import { isAutomationExecutionEnabled } from "@/lib/automations";
import { AutomationDestinationCell } from "./destination-cell";
import { FILTERS, automationNeedsAttention } from "./hub-status";
import { automationListStatusLabel, automationListStatusTone } from "./hub-visual";
import { publicationActionState } from "./publication-actions";
import { PublicationStatus } from "./publication-status";
import { RowActionsMenu } from "./row-actions-menu";
import type { AutomationsWorkspace } from "./use-automations-workspace";
import { VideoAutomationMenu } from "./video-automation-menu";

export function VideoAutomationList({
  hub,
}: {
  hub: AutomationsWorkspace;
}) {
  const {
    records,
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
    <section className="flex min-w-0 flex-1 flex-col rounded-xl bg-panel p-5 shadow-panel">
      <div className="flex flex-wrap items-center gap-3 pb-3">
        <h2 className="wb-panel-title min-w-0 flex-1">Your automations</h2>
        <div className="max-w-full overflow-x-auto" hidden={records.length === 0}>
          <Segmented
            label="Filter automations"
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((item) => ({
              value: item,
              label: item,
              count: item === "Needs attention" ? attentionCount : undefined,
            }))}
          />
        </div>
      </div>

      {records.length === 0 ? (
        <EmptyState icon="automations" title="No video automations yet" className="flex-1">
          <Link href="/automations/new" className={buttonClass("strong", 36)}>
            Choose a playbook
          </Link>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState icon="automations" title="No automations in this filter" className="flex-1" />
      ) : (
        <div className="flex flex-col">
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
            const isBusy = busy === record.id;

            return (
              <article
                key={record.id}
                aria-busy={isBusy || undefined}
                className="relative grid min-h-[58px] min-w-0 grid-cols-[minmax(0,1fr)_30px] items-center gap-x-4 gap-y-2 border-b border-hairline px-3 py-2 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_150px_140px_124px_30px]"
              >
                <div className="min-w-0 lg:col-start-1">
                  <p className="wb-row-title">{record.name}</p>
                  <p className="wb-row-sub">
                    {templateLabel(record.template)}, {record.content.slideCount} slides
                  </p>
                </div>

                <div className="col-start-1 min-w-0 lg:col-start-2">
                  <AutomationDestinationCell
                    record={record}
                    providers={integrationStatuses}
                    loading={integrationsLoading}
                  />
                </div>

                <div className="col-start-1 flex min-w-0 flex-col lg:col-start-3">
                  <span className="text-[13px] leading-[18px] text-fg">
                    {record.schedule.days.join(", ") || "No days"}
                  </span>
                  <span className="wb-mono text-fg-muted" title={record.schedule.timezone}>
                    {record.schedule.time} {record.schedule.timezone}
                  </span>
                  {record.lastRunAt && (
                    <span className="text-[12px] leading-4 text-fg-muted">
                      Draft queued {new Date(record.lastRunAt).toLocaleDateString()}
                    </span>
                  )}
                  {record.scheduler?.lastJobId && (
                    <span className="wb-mono min-w-0 break-words text-fg-muted [overflow-wrap:anywhere]">
                      Job {record.scheduler.lastJobId}
                    </span>
                  )}
                  {record.scheduler?.lastError && (
                    <span
                      role="alert"
                      className="min-w-0 break-words text-[12px] leading-4 text-bad [overflow-wrap:anywhere]"
                    >
                      {record.scheduler.lastError}
                    </span>
                  )}
                </div>

                <div className="col-start-1 min-w-0 lg:col-start-4">
                  <StatusChip tone={automationListStatusTone(needsAttention, scheduleActive)}>
                    {automationListStatusLabel(record, needsAttention)}
                  </StatusChip>
                  {record.publication && <PublicationStatus publication={record.publication} />}
                </div>

                <RowActionsMenu
                  className="relative col-start-2 row-start-1 self-start lg:col-start-5 lg:self-center"
                  label={`Actions for ${record.name}`}
                  open={menu === record.id}
                  onOpenChange={(open) => setMenu(open ? record.id : null)}
                >
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
                      onSetManualResolutionDialog: (state) => {
                        setMenu(null);
                        setManualResolutionDialog(state);
                      },
                      onDuplicate: () => duplicate(record),
                      onRemove: () => remove(record),
                    }}
                  />
                </RowActionsMenu>

                {isBusy && (
                  <div className="absolute inset-0 grid place-items-center rounded-lg bg-panel/80 text-[13px] font-semibold text-fg-secondary">
                    Working
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

function templateLabel(template: string) {
  const words = template.replaceAll("-", " ");
  return words ? words[0].toUpperCase() + words.slice(1) : words;
}
