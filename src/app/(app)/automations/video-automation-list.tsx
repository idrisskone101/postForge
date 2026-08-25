"use client";

import Link from "next/link";
import {
  CircleAlert,
  Copy,
  Edit3,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  WandSparkles,
  Workflow,
} from "lucide-react";
import {
  isAutomationExecutionEnabled,
  isAutomationSocialDestination,
  publicationIsUnresolved,
} from "@/lib/automations";
import { cn } from "@/lib/utils";
import { AutomationDestinationCell } from "./destination-cell";
import { FILTERS, automationNeedsAttention, statusLabel } from "./hub-status";
import { publicationActionState } from "./publication-actions";
import { PublicationStatus } from "./publication-status";
import type { AutomationsWorkspace } from "./use-automations-workspace";

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
        <section className="pf-card mt-3 overflow-visible p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h2 className="pf-section-title mt-1">Your automations</h2><p className="mt-1 max-w-[560px] min-w-0 break-words text-[12px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">Manual Review queue plans can generate real image drafts on their saved local schedule after you activate them. Social plans never auto-publish: each approved Gallery video requires a separate provider review and explicit confirmation.</p></div><div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-[var(--pf-active)] p-1">{FILTERS.map((item) => <button key={item} onClick={() => setFilter(item)} className={cn("h-7 whitespace-nowrap rounded-lg px-2 text-[12px] text-muted-foreground",filter === item && "bg-white font-semibold text-foreground shadow-sm")}>{item}{item === "Needs attention" && attentionCount > 0 && <span className="ml-1 rounded-full bg-[var(--pf-orange)] px-1.5 py-0.5 text-[11px] text-white">{attentionCount}</span>}</button>)}</div></div>
          <div className="mt-4 hidden grid-cols-[1.5fr_1fr_1fr_.8fr_28px] gap-3 px-2 text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground md:grid"><span>Automation</span><span>Destination</span><span>Cadence</span><span>Status</span><span /></div>
          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <Workflow className="mx-auto size-7 text-muted-foreground" />
              <h3 className="mt-2 text-[13px] font-semibold">
                No automations in this filter
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Try All or create another workflow.
              </p>
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
                  record.status === "active" &&
                  isAutomationExecutionEnabled(record);
                const canControlLocalSchedule =
                  record.destination === "manual" || scheduleActive;
                const {
                  pendingRecoverable,
                  canRefreshPublication,
                  failedReconciliationStage,
                  manualOutcomeStage,
                  manualOutcomeResolvable,
                  negativeOutcomeResolvable,
                } = publicationActionState(record);
                return (
                  <article
                    key={record.id}
                    className="relative grid min-w-0 gap-3 border-t border-border px-2 py-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,.8fr)_28px] md:items-center"
                  >
                    <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-2">
                      <span className="grid h-12 w-10 place-items-center rounded-lg bg-[var(--pf-orange)] text-white">
                        <Workflow className="size-4 shrink-0" />
                      </span>
                      <span className="min-w-0">
                        <b className="block truncate text-[11px]">{record.name}</b>
                        <small className="mt-1 block truncate text-[12px] text-muted-foreground">
                          {record.content.slideCount} slides ·{" "}
                          {record.template.replaceAll("-", " ")}
                        </small>
                      </span>
                    </div>
                    <AutomationDestinationCell
                      record={record}
                      providers={integrationStatuses}
                      loading={integrationsLoading}
                    />
                    <div className="min-w-0 break-words text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                      <span>
                        {record.schedule.days.join(", ")} · {record.schedule.time}
                      </span>
                      <small className="mt-1 block text-[11px] text-muted-foreground">
                        {record.schedule.timezone}
                      </small>
                      {record.lastRunAt && (
                        <small className="mt-1 block text-[11px] text-muted-foreground">
                          Draft queued {new Date(record.lastRunAt).toLocaleDateString()}
                        </small>
                      )}
                      {record.scheduler?.lastJobId && (
                        <small className="mt-1 block min-w-0 break-words font-mono text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
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
                      <span
                        className={cn(
                          "inline-block max-w-full break-words rounded-full px-2 py-1 text-[11px] font-bold [overflow-wrap:anywhere]",
                          needsAttention
                            ? "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                            : scheduleActive
                              ? "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                              : "bg-[var(--pf-active)] text-muted-foreground"
                        )}
                      >
                        {needsAttention ? "Needs attention" : statusLabel(record)}
                      </span>
                      {record.publication && (
                        <PublicationStatus publication={record.publication} />
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenu(menu === record.id ? null : record.id)}
                        className="grid size-7 place-items-center rounded-lg hover:bg-[var(--pf-active)]"
                        aria-label={`Actions for ${record.name}`}
                      >
                        <MoreHorizontal className="size-4 shrink-0" />
                      </button>
                      {menu === record.id && (
                        <div className="absolute right-0 top-8 z-30 max-h-[min(70dvh,420px)] w-56 min-w-0 overscroll-contain overflow-y-auto rounded-lg border border-border bg-white p-1.5 text-[11px] shadow-xl">
                          {canControlLocalSchedule ? (
                            <button
                              onClick={() =>
                                changeLocalSchedule(
                                  record,
                                  scheduleActive ? "pause" : "activate"
                                )
                              }
                              className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
                            >
                              {scheduleActive ? (
                                <Pause className="size-3 shrink-0" />
                              ) : (
                                <Play className="size-3 shrink-0" />
                              )}
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                {scheduleActive
                                  ? "Pause local schedule"
                                  : "Activate local schedule"}
                              </span>
                            </button>
                          ) : (
                            <p className="flex min-w-0 items-start gap-2 px-2 py-2 text-[12px] leading-3 text-muted-foreground">
                              <CircleAlert className="mt-0.5 size-3 shrink-0" />
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                Local scheduling is unavailable for social destinations.
                              </span>
                            </p>
                          )}
                          <button
                            onClick={() => generateReviewDraft(record)}
                            className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
                          >
                            <WandSparkles className="size-3 shrink-0" />
                            Generate review draft
                          </button>
                          {isAutomationSocialDestination(record.destination) &&
                            record.publication?.status !== "submitted" &&
                            record.publication?.status !== "pending" &&
                            record.publication?.status !== "published" &&
                            record.publication?.providerStatus !==
                              "LOCAL_RETENTION_OUTCOME_UNKNOWN" && (
                              <button
                                onClick={() => openPublishReview(record)}
                                className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
                              >
                                <Send className="size-3 shrink-0" />
                                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                  {record.publication?.status === "failed"
                                    ? "Review and retry publish"
                                    : "Publish approved video"}
                                </span>
                              </button>
                            )}
                          {canRefreshPublication && (
                            <button
                              onClick={() => refreshPublication(record)}
                              className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
                            >
                              <RefreshCw className="size-3 shrink-0" />
                              Refresh provider status
                            </button>
                          )}
                          {pendingRecoverable && (
                            <button
                              onClick={() => recoverPendingPublication(record)}
                              className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
                            >
                              <RefreshCw className="size-3 shrink-0" />
                              Recover interrupted attempt
                            </button>
                          )}
                          {manualOutcomeStage && (
                              <div className="min-w-0 px-2 py-2 text-[12px] leading-3 text-[var(--pf-lamp-amber)]">
                                <p className="flex min-w-0 items-start gap-2">
                                  <CircleAlert className="mt-0.5 size-3 shrink-0" />
                                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                    {failedReconciliationStage
                                      ? "The latest provider reconciliation failed. You can retry this safe status check, but PostForge will not blindly publish again."
                                      : "Provider outcome is unknown. Verify this exact post on the connected account; automatic retry is disabled."}
                                  </span>
                                </p>
                                {manualOutcomeResolvable && (
                                  <div className="mt-2 grid min-w-0 gap-1">
                                    <button
                                      onClick={() =>
                                        setManualResolutionDialog({
                                          record,
                                          resolution: "published",
                                          error: null,
                                        })
                                      }
                                      className="min-h-7 min-w-0 break-words rounded-lg border border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 px-2 text-left font-semibold text-[var(--pf-success)] [overflow-wrap:anywhere]"
                                    >
                                      I verified it published
                                    </button>
                                    {negativeOutcomeResolvable ? (
                                      <button
                                        onClick={() =>
                                        setManualResolutionDialog({
                                          record,
                                          resolution: "not_published",
                                          error: null,
                                        })
                                        }
                                        className="min-h-7 min-w-0 break-words rounded-lg border border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10 px-2 text-left font-semibold text-[var(--pf-lamp-amber)] [overflow-wrap:anywhere]"
                                      >
                                        I verified it did not publish
                                      </button>
                                    ) : (
                                      <p className="min-w-0 break-words rounded-lg bg-[var(--pf-lamp-amber)]/10 px-2 py-1.5 [overflow-wrap:anywhere]">
                                        Negative resolution stays locked while provider processing or moderation may still be underway ({record.publication?.provider === "tiktok" ? "6 hours" : "1 hour"}).
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          <Link
                            href={`/automations/new?id=${encodeURIComponent(record.id)}`}
                            className="flex min-h-8 min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--pf-active)]"
                          >
                            <Edit3 className="size-3 shrink-0" /> Edit workflow
                          </Link>
                          <button
                            onClick={() => duplicate(record)}
                            className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--pf-active)]"
                          >
                            <Copy className="size-3 shrink-0" /> Duplicate
                          </button>
                          {publicationIsUnresolved(record.publication) ? (
                            <p className="flex min-w-0 items-start gap-2 px-2 py-2 text-[12px] leading-3 text-muted-foreground">
                              <ShieldCheck className="mt-0.5 size-3 shrink-0" />
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                Destination, account, approved asset, and deletion stay locked until the provider reaches a final state.
                              </span>
                            </p>
                          ) : (
                            <button
                              onClick={() => remove(record)}
                              className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10"
                            >
                              <Trash2 className="size-3 shrink-0" /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {busy === record.id && (
                      <div className="absolute inset-0 grid place-items-center bg-card/80">
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
