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
import { menuDangerItemClass, menuItemClass } from "./row-actions-menu";

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
    <>
      {canControlLocalSchedule ? (
        <button
          onClick={onChangeLocalSchedule}
          className={menuItemClass}
        >
          {scheduleActive ? <Pause className="size-4 shrink-0" strokeWidth={1.5} /> : <Play className="size-4 shrink-0" strokeWidth={1.5} />}
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            {scheduleActive ? "Pause local schedule" : "Activate local schedule"}
          </span>
        </button>
      ) : (
        <p className="flex min-w-0 items-start gap-2.5 px-2.5 py-2 text-[12px] leading-4 text-fg-secondary">
          <CircleAlert className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            Local scheduling is unavailable for social destinations. Social plans never auto-publish: each post needs your review and explicit confirmation.
          </span>
        </p>
      )}

      <button
        onClick={onGenerateReviewDraft}
        className={menuItemClass}
      >
        <WandSparkles className="size-4 shrink-0" strokeWidth={1.5} />
        Generate review draft
      </button>

      {isAutomationSocialDestination(record.destination) &&
        record.publication?.status !== "submitted" &&
        record.publication?.status !== "pending" &&
        record.publication?.status !== "published" &&
        record.publication?.providerStatus !== "LOCAL_RETENTION_OUTCOME_UNKNOWN" && (
          <button
            onClick={onOpenPublishReview}
            className={menuItemClass}
          >
            <Send className="size-4 shrink-0" strokeWidth={1.5} />
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
          className={menuItemClass}
        >
          <RefreshCw className="size-4 shrink-0" strokeWidth={1.5} />
          Refresh provider status
        </button>
      )}

      {pendingRecoverable && (
        <button
          onClick={onRecoverPendingPublication}
          className={menuItemClass}
        >
          <RefreshCw className="size-4 shrink-0" strokeWidth={1.5} />
          Recover interrupted attempt
        </button>
      )}

      {manualOutcomeStage && (
        <div className="min-w-0 px-2.5 py-2 text-[12px] leading-4 text-warn">
          <p className="flex min-w-0 items-start gap-2.5">
            <CircleAlert className="size-4 shrink-0" strokeWidth={1.5} />
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
                className="min-h-8 min-w-0 break-words rounded-full bg-raised-strong px-3 text-left text-[12px] font-semibold text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-strong [overflow-wrap:anywhere]"
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
                  className="min-h-8 min-w-0 break-words rounded-full bg-raised-strong px-3 text-left text-[12px] font-semibold text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-strong [overflow-wrap:anywhere]"
                >
                  I verified it did not publish
                </button>
              ) : (
                <p className="min-w-0 break-words rounded-lg bg-warn-tint px-2.5 py-2 text-fg-secondary [overflow-wrap:anywhere]">
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
        className={menuItemClass}
      >
        <Edit3 className="size-4 shrink-0" strokeWidth={1.5} /> Edit workflow
      </Link>

      <button
        onClick={onDuplicate}
        className={menuItemClass}
      >
        <Copy className="size-4 shrink-0" strokeWidth={1.5} /> Duplicate
      </button>

      {publicationIsUnresolved(record.publication) ? (
        <p className="flex min-w-0 items-start gap-2.5 px-2.5 py-2 text-[12px] leading-4 text-fg-secondary">
          <ShieldCheck className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            Destination, account, approved asset, and deletion stay locked until the provider reaches a final state.
          </span>
        </p>
      ) : (
        <button
          onClick={onRemove}
          className={menuDangerItemClass}
        >
          <Trash2 className="size-4 shrink-0" strokeWidth={1.5} /> Delete
        </button>
      )}
    </>
  );
}
