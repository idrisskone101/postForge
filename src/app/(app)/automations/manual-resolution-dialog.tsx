"use client";

import { Check, CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { automationDestinationLabel } from "@/lib/automations";
import { cn } from "@/lib/utils";
import type { ManualResolutionDialogState } from "./hub-types";

export function ManualResolutionDialog({
  state,
  busy,
  onClose,
  onConfirm,
}: {
  state: ManualResolutionDialogState;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const published = state.resolution === "published";
  const provider = automationDestinationLabel(state.record.destination);
  return (
    <div
      className="pf-safe-overlay fixed inset-0 z-[100] grid min-w-0 place-items-center overflow-y-auto bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-resolution-title"
    >
      <div className="max-h-full w-full min-w-0 max-w-[470px] overflow-y-auto rounded-[12px] border border-border bg-white p-5 shadow-2xl sm:p-6">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-full",
            published
              ? "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
              : "bg-[var(--pf-lamp-amber)]/10 text-[var(--pf-lamp-amber)]"
          )}
        >
          {published ? (
            <Check className="size-4" />
          ) : (
            <CircleAlert className="size-4" />
          )}
        </span>

        <h2
          id="manual-resolution-title"
          className="mt-1 min-w-0 break-words text-[20px] font-semibold tracking-[-0.035em] [overflow-wrap:anywhere]"
        >
          {published
            ? `Confirm this exact ${provider} post is live`
            : `Confirm ${provider} did not publish this attempt`}
        </h2>
        <p className="mt-2 min-w-0 break-words text-[11px] leading-5 text-muted-foreground [overflow-wrap:anywhere] dark:text-[var(--pf-muted)]">
          {published
            ? "Only continue after you personally found this exact video on the connected account. PostForge will record your confirmation as the final outcome."
            : "Only continue after checking the connected account after the provider settling window. This unlocks a new explicit review and could duplicate a delayed post if the verification is wrong."}
        </p>
        <div className="mt-3 min-w-0 rounded-lg bg-[var(--pf-active)] p-3 text-[11px] text-muted-foreground dark:bg-[var(--pf-active)] dark:text-[var(--pf-muted)]">
          <b className="block min-w-0 break-words [overflow-wrap:anywhere]">
            {state.record.name}
          </b>
          <span className="mt-1 block min-w-0 break-words [overflow-wrap:anywhere]">
            Account {state.record.accountLabel || state.record.accountId || "unknown"}
          </span>
        </div>
        {state.error && (
          <p
            role="alert"
            className="mt-3 min-w-0 break-words rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 p-3 text-[11px] leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere]"
          >
            {state.error}
          </p>
        )}
        <div className="mt-5 flex min-w-0 flex-col-reverse gap-2 min-[420px]:flex-row min-[420px]:justify-end pb-[max(0px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="pf-button-secondary justify-center disabled:opacity-45"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-white disabled:opacity-45",
              published ? "bg-[var(--pf-success)]" : "bg-[var(--pf-lamp-amber)]"
            )}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : published ? (
              <Check className="size-3.5" />
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            {published
              ? "I verified it is published"
              : "I verified it was not published"}
          </button>
        </div>
      </div>
    </div>
  );
}
