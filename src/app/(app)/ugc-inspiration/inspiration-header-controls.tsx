"use client";

import { Loader2, Users } from "lucide-react";

interface InspirationHeaderControlsProps {
  handleInput: string;
  isAddingAccount: boolean;
  onHandleInputChange: (value: string) => void;
  onTrackAccount: () => void;
}

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
      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_2.5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
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
          className="h-10 min-w-0 rounded-lg border border-border bg-card px-3 text-xs shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onTrackAccount}
          disabled={isAddingAccount || !handleInput.trim()}
          className="inline-flex h-10 min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--pf-orange)] px-0 text-xs font-semibold text-white hover:brightness-[0.93] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        >
          {isAddingAccount ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span className="hidden sm:inline">Tracking...</span>
              <span className="sr-only sm:hidden">Tracking creator</span>
            </>
          ) : (
            <>
              <Users className="size-4" />
              <span className="hidden sm:inline">Track Creator</span>
              <span className="sr-only sm:hidden">Track Creator</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
