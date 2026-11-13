"use client";

import { useEffect, useRef } from "react";
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
    onClose,
  } = menu;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listeners = new AbortController();
    const anchor = menuRef.current?.parentElement;
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape") return;
        onClose();
        anchor?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
      },
      { signal: listeners.signal }
    );
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!anchor?.contains(event.target as Node)) onClose();
      },
      { signal: listeners.signal }
    );
    return () => listeners.abort();
  }, [onClose]);

  return (
    <div ref={menuRef} role="menu" className="wb-float wb-fade-in absolute right-0 top-9 z-30 max-h-[min(70dvh,440px)] w-64 min-w-0 overscroll-contain overflow-y-auto p-1.5">
      {canControlLocalSchedule ? (
        <button
          onClick={onChangeLocalSchedule}
          className="flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong"
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
        className="flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong"
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
            className="flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong"
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
          className="flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong"
        >
          <RefreshCw className="size-4 shrink-0" strokeWidth={1.5} />
          Refresh provider status
        </button>
      )}

      {pendingRecoverable && (
        <button
          onClick={onRecoverPendingPublication}
          className="flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong"
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
        className="flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong"
      >
        <Edit3 className="size-4 shrink-0" strokeWidth={1.5} /> Edit workflow
      </Link>

      <button
        onClick={onDuplicate}
        className="flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong"
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
          className="flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium leading-4 text-bad transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-bad-tint"
        >
          <Trash2 className="size-4 shrink-0" strokeWidth={1.5} /> Delete
        </button>
      )}
    </div>
  );
}
