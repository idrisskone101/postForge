"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Bare amber count after the label, as on "Needs review 2". */
  count?: number;
  /** Icon-only segment: pass the icon as `label` and name it here. */
  ariaLabel?: string;
};

type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  /** Add `wb-segmented-block` to stretch with equal-width segments. */
  className?: string;
};

/** Raised pill bed; the active segment steps up in 200ms. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("wb-segmented", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="wb-segment"
          aria-pressed={option.value === value}
          aria-label={option.ariaLabel}
          data-icon={option.ariaLabel ? "true" : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count ? <span className="wb-segment-count">{option.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
