"use client";

import Link from "next/link";
import {
  CircleAlert,
  Copy,
  Edit3,
  Pause,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  isAutomationSocialDestination,
  publicationIsUnresolved,
} from "@/lib/automations";
import type { VideoAutomationMenuModel } from "./hub-types";

export function VideoAutomationMenu({ menu }: { menu: VideoAutomationMenuModel }) {
  const {
    record,
    scheduleActive,
    canControlLocalSchedule,
    pendingRecoverable,
    canRefreshPublication,
    failedReconciliationStage,
    manualOutcomeStage,
    manualOutcomeResolvable,
    negativeOutcomeResolvable,
    onChangeLocalSchedule,
    onGenerateReviewDraft,
    onOpenPublishReview,
    onRefreshPublication,
    onRecoverPendingPublication,
    onSetManualResolutionDialog,
    onDuplicate,
    onRemove,
  } = menu;

  return (
    <div className="absolute right-0 top-8 z-30 max-h-[min(70dvh,420px)] w-56 min-w-0 overscroll-contain overflow-y-auto rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-1.5 text-[11px] shadow-[var(--pf-shadow-lg)]">
      {canControlLocalSchedule ? (
        <button
          onClick={onChangeLocalSchedule}
          className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
        >
          {scheduleActive ? <Pause className="size-3 shrink-0" /> : <Play className="size-3 shrink-0" />}
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            {scheduleActive ? "Pause local schedule" : "Activate local schedule"}
          </span>
        </button>
      ) : (
        <p className="flex min-w-0 items-start gap-2 px-2 py-2 text-[12px] leading-3 text-[var(--pf-muted)]">
          <CircleAlert className="mt-0.5 size-3 shrink-0" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            Local scheduling is unavailable for social destinations.
          </span>
        </p>
      )}

      <button
        onClick={onGenerateReviewDraft}
        className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
      >
        <WandSparkles className="size-3 shrink-0" />
        Generate review draft
      </button>

      {isAutomationSocialDestination(record.destination) &&
        record.publication?.status !== "submitted" &&
        record.publication?.status !== "pending" &&
        record.publication?.status !== "published" &&
        record.publication?.providerStatus !== "LOCAL_RETENTION_OUTCOME_UNKNOWN" && (
          <button
            onClick={onOpenPublishReview}
            className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
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
          onClick={onRefreshPublication}
          className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
        >
          <RefreshCw className="size-3 shrink-0" />
          Refresh provider status
        </button>
      )}

      {pendingRecoverable && (
        <button
          onClick={onRecoverPendingPublication}
          className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
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
                  onSetManualResolutionDialog({
                    record,
                    resolution: "published",
                    error: null,
                  })
                }
                className="min-h-7 min-w-0 break-words rounded-[8px] border border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 px-2 text-left font-semibold text-[var(--pf-success)] [overflow-wrap:anywhere]"
              >
                I verified it published
              </button>
              {negativeOutcomeResolvable ? (
                <button
                  onClick={() =>
                    onSetManualResolutionDialog({
                      record,
                      resolution: "not_published",
                      error: null,
                    })
                  }
                  className="min-h-7 min-w-0 break-words rounded-[8px] border border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10 px-2 text-left font-semibold text-[var(--pf-lamp-amber)] [overflow-wrap:anywhere]"
                >
                  I verified it did not publish
                </button>
              ) : (
                <p className="min-w-0 break-words rounded-[8px] bg-[var(--pf-lamp-amber)]/10 px-2 py-1.5 [overflow-wrap:anywhere]">
                  Negative resolution stays locked while provider processing or moderation may still be underway (
                  {record.publication?.provider === "tiktok" ? "6 hours" : "1 hour"}).
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <Link
        href={`/automations/new?id=${encodeURIComponent(record.id)}`}
        className="flex min-h-8 min-w-0 items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-[var(--pf-active)]"
      >
        <Edit3 className="size-3 shrink-0" /> Edit workflow
      </Link>

      <button
        onClick={onDuplicate}
        className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-[var(--pf-active)]"
      >
        <Copy className="size-3 shrink-0" /> Duplicate
      </button>

      {publicationIsUnresolved(record.publication) ? (
        <p className="flex min-w-0 items-start gap-2 px-2 py-2 text-[12px] leading-3 text-[var(--pf-muted)]">
          <ShieldCheck className="mt-0.5 size-3 shrink-0" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            Destination, account, approved asset, and deletion stay locked until the provider reaches a final state.
          </span>
        </p>
      ) : (
        <button
          onClick={onRemove}
          className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-2 py-1.5 text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10"
        >
          <Trash2 className="size-3 shrink-0" /> Delete
        </button>
      )}
    </div>
  );
}
