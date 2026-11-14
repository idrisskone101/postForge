"use client";

import { createPortal } from "react-dom";
import { Button, Icon } from "@/components/workbench";
import { automationDestinationLabel } from "@/lib/automations";
import { cn } from "@/lib/utils";
import type { ManualResolutionDialogState } from "./hub-types";
import { useDialogKeys } from "./publish-dialog-controls";

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
  const onKeyDown = useDialogKeys({ recordName: state.record.name, busy, onClose });
  const provider = automationDestinationLabel(state.record.destination);
  return createPortal(
    <div
      className="pf-safe-overlay fixed inset-0 z-[100] grid min-w-0 place-items-center overflow-y-auto bg-[var(--pf-scrim)] [animation:wb-fade-in_var(--pf-dur-enter)_var(--pf-ease)_both]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-resolution-title"
      onKeyDown={onKeyDown}
    >
      <div className="flex max-h-full w-full min-w-0 max-w-[460px] flex-col gap-4 overflow-y-auto rounded-xl bg-panel p-5 shadow-float [animation:wb-rise-in_var(--pf-dur-enter)_var(--pf-ease)_both] sm:p-6">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full",
            published ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn"
          )}
        >
          <Icon name={published ? "check" : "alert"} size={18} strokeWidth={2} />
        </span>

        <div className="flex min-w-0 flex-col gap-2">
          <h2
            id="manual-resolution-title"
            className="wb-panel-title break-words [overflow-wrap:anywhere]"
          >
            {published
              ? `Confirm this exact ${provider} post is live`
              : `Confirm ${provider} did not publish this attempt`}
          </h2>
          <p className="min-w-0 break-words text-[13px] leading-5 text-fg-secondary [overflow-wrap:anywhere]">
            {published
              ? "Only continue after you personally found this exact video on the connected account. PostForge will record your confirmation as the final outcome."
              : "Only continue after checking the connected account after the provider settling window. This unlocks a new explicit review and could duplicate a delayed post if the verification is wrong."}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-1 rounded-lg bg-raised px-3.5 py-3">
          <span className="min-w-0 break-words text-[13px] font-semibold leading-[18px] text-fg [overflow-wrap:anywhere]">
            {state.record.name}
          </span>
          <span className="min-w-0 break-words text-[13px] leading-[18px] text-fg-secondary [overflow-wrap:anywhere]">
            Account {state.record.accountLabel || state.record.accountId || "unknown"}
          </span>
        </div>

        {state.error && (
          <p
            role="alert"
            className="wb-notice min-w-0 break-words [overflow-wrap:anywhere]"
            data-tone="bad"
          >
            {state.error}
          </p>
        )}

        <div className="flex min-w-0 flex-col-reverse gap-2.5 pt-1 pb-[max(0px,env(safe-area-inset-bottom))] min-[420px]:flex-row min-[420px]:justify-end">
          <Button
            size={40}
            autoFocus
            onClick={onClose}
            disabled={busy}
            className="w-full min-[420px]:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="strong"
            size={40}
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy || undefined}
            className="w-full min-[420px]:w-auto"
          >
            {published ? "I verified it is published" : "I verified it was not published"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
