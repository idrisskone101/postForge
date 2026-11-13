"use client";

import { useState } from "react";
import { Icon } from "@/components/workbench/icon";
import { isTrackableHandle, TRACK_CREATOR_INPUT_ID } from "./inspiration-models";
import type { InspirationHeaderControlsProps } from "./types";

export function InspirationHeaderControls({
  handleInput,
  isAddingAccount,
  onHandleInputChange,
  onTrackAccount,
}: InspirationHeaderControlsProps) {
  const [invalid, setInvalid] = useState(false);
  const errorId = `${TRACK_CREATOR_INPUT_ID}-error`;

  function submit() {
    if (isAddingAccount) return;
    if (!isTrackableHandle(handleInput)) {
      setInvalid(true);
      document.getElementById(TRACK_CREATOR_INPUT_ID)?.focus();
      return;
    }
    setInvalid(false);
    onTrackAccount();
  }

  return (
    <form
      className="relative flex min-w-0 items-center gap-2 max-sm:flex-wrap max-sm:justify-end"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className={FIELD_CLASS}>
        <AtIcon />
        <span className="sr-only">Creator to track</span>
        <input
          id={TRACK_CREATOR_INPUT_ID}
          value={handleInput}
          onChange={(event) => {
            onHandleInputChange(event.target.value);
            if (invalid) setInvalid(false);
          }}
          placeholder="@creator or TikTok profile URL"
          autoComplete="off"
          spellCheck={false}
          disabled={isAddingAccount}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] leading-[18px] text-fg outline-none placeholder:text-fg-muted disabled:text-fg-disabled"
        />
      </label>
      <button
        type="submit"
        disabled={isAddingAccount}
        aria-label={isAddingAccount ? "Tracking creator" : "Track creator"}
        className="wb-btn wb-btn-primary wb-btn-40 shrink-0 max-sm:w-10 max-sm:px-0"
      >
        <Icon name="plus" strokeWidth={2} />
        <span className="max-sm:hidden">{isAddingAccount ? "Tracking" : "Track creator"}</span>
      </button>
      {invalid && (
        <p
          id={errorId}
          role="alert"
          className="wb-float wb-fade-in text-[13px] leading-4 text-bad max-sm:basis-full max-sm:rounded-none max-sm:bg-transparent max-sm:px-1 max-sm:shadow-none sm:absolute sm:top-full sm:left-0 sm:z-30 sm:mt-2 sm:px-3 sm:py-2"
        >
          Enter a TikTok @handle or profile URL
        </p>
      )}
    </form>
  );
}

const FIELD_CLASS = [
  "flex h-10 w-[min(300px,calc(100vw-108px))] min-w-0 shrink-0 items-center gap-2 rounded-lg bg-raised px-4 text-fg-muted",
  "shadow-[inset_0_0_0_0_var(--pf-ember)] transition-shadow duration-[var(--pf-dur-feedback)] ease-pf",
  "focus-within:shadow-[inset_0_0_0_2px_var(--pf-ember)]",
  "has-[[aria-invalid=true]]:shadow-[inset_0_0_0_2px_var(--pf-bad)]",
].join(" ");

function AtIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M16 12a4 4 0 1 1-4-4c2.2 0 4 1.5 4 4v1.5a2 2 0 0 0 4 0" />
    </svg>
  );
}
