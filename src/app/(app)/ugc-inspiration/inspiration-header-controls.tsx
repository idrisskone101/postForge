"use client";

import { Loader2, Users } from "lucide-react";
import type { InspirationHeaderControlsProps } from "./types";

export function InspirationHeaderControls({
  handleInput,
  isAddingAccount,
  onHandleInputChange,
  onTrackAccount,
}: InspirationHeaderControlsProps) {
  return (
    <div className="w-full min-w-0 lg:w-[31rem]">
      <p className="sr-only">
        Source Selection. Compare creator posts and send the strongest source straight into Clone.
      </p>
      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          value={handleInput}
          onChange={(event) => onHandleInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onTrackAccount();
            }
          }}
          placeholder="@creator or TikTok profile URL"
          disabled={isAddingAccount}
          className="h-10 min-w-0 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3 text-[13px] text-[var(--pf-ink)] shadow-none outline-none placeholder:text-[var(--pf-muted)] focus-visible:border-[var(--pf-orange)] focus-visible:ring-3 focus-visible:ring-[var(--pf-orange)]/15 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onTrackAccount}
          disabled={isAddingAccount || !handleInput.trim()}
          className="pf-button-primary h-10 shrink-0 px-3 sm:px-4"
        >
          {isAddingAccount ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Tracking...
            </>
          ) : (
            <>
              <Users className="size-4" />
              Track Creator
            </>
          )}
        </button>
      </div>
    </div>
  );
}
