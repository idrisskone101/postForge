"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldLabel({
  label,
  detail,
  children,
}: {
  label: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex min-w-0 items-start justify-between gap-2 text-[13px] font-semibold">
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label}</span>
        <small className="shrink-0 font-normal text-muted-foreground dark:text-[var(--pf-muted)]">
          {detail}
        </small>
      </span>
      {children}
    </label>
  );
}

export function CheckControl({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-lg border border-border bg-white px-2.5 py-2 text-[11px] leading-4",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-3.5 shrink-0 accent-[var(--pf-orange)]"
      />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
        {label}
        {disabled ? " (disabled by creator settings)" : ""}
      </span>
    </label>
  );
}
