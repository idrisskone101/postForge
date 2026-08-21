"use client";

import { Check, ChevronDown, Cloud, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { FIELD_LABEL } from "./studio-ui";

export type EditorSaveState = "unsaved" | "saving" | "saved" | "error";

export function NativeSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  optionLabel,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  className?: string;
  optionLabel?: (value: T) => string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className={FIELD_LABEL}>{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="h-9 w-full appearance-none rounded-lg border border-border bg-card px-2.5 pr-7 text-[11px] font-medium capitalize text-foreground outline-none transition focus:border-[var(--pf-orange)] focus:ring-2 focus:ring-[var(--pf-orange)]/10"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabel?.(option) ?? (option === "none" ? "None" : option)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}

export function sliderNumber(
  value: number | readonly number[],
  fallback: number,
) {
  return typeof value === "number" ? value : (value[0] ?? fallback);
}

export function AutosaveStatus({ state }: { state: EditorSaveState }) {
  const contents = {
    unsaved: {
      icon: Cloud,
      label: "Unsaved changes",
      className: "text-amber-600 dark:text-amber-300",
    },
    saving: {
      icon: LoaderCircle,
      label: "Saving...",
      className: "text-accent-blue",
    },
    saved: {
      icon: Check,
      label: "All changes saved",
      className: "text-accent-green",
    },
    error: {
      icon: Cloud,
      label: "Save failed",
      className: "text-destructive",
    },
  }[state];
  const Icon = contents.icon;

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-semibold",
        contents.className,
      )}
    >
      <Icon className={cn("size-3.5", state === "saving" && "animate-spin")} />
      {contents.label}
    </span>
  );
}
