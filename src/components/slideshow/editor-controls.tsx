"use client";

import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/workbench";
import { cn } from "@/lib/utils";

export type EditorSaveState = "unsaved" | "saving" | "saved" | "error";

export type EditorOption<T extends string> = { value: T; label: string };

export function EditorSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly EditorOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="wb-field">
      <span className="wb-label">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="wb-input"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function sliderNumber(
  value: number | readonly number[],
  fallback: number,
) {
  return typeof value === "number" ? value : (value[0] ?? fallback);
}

const SAVE_STATUS: Record<
  EditorSaveState,
  { icon: IconName; label: string; tone: string; text: string }
> = {
  saved: { icon: "check", label: "Saved", tone: "text-ok", text: "text-fg-muted" },
  saving: { icon: "clock", label: "Saving", tone: "text-fg-muted", text: "text-fg-muted" },
  unsaved: { icon: "clock", label: "Unsaved changes", tone: "text-warn", text: "text-fg-secondary" },
  error: { icon: "alert", label: "Save failed", tone: "text-bad", text: "text-bad" },
};

export function AutosaveStatus({ state }: { state: EditorSaveState }) {
  const status = SAVE_STATUS[state];
  return (
    <span
      role="status"
      data-save-state={state}
      className="inline-flex items-center gap-1.5 pr-1.5 text-[13px] leading-[21px] whitespace-nowrap"
    >
      <Icon
        name={status.icon}
        size={14}
        strokeWidth={state === "saved" ? 2.5 : 2}
        className={status.tone}
      />
      <span className={status.text}>{status.label}</span>
    </span>
  );
}

export function EditorDisclosure({
  title,
  meta,
  open,
  onToggle,
  children,
}: {
  title: string;
  meta?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col border-t border-hairline pt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex h-9 items-center justify-between rounded-full px-1 text-[13px] font-semibold text-fg transition-colors duration-160 ease-pf hover:text-fg-secondary"
      >
        <span className="flex min-w-0 items-center gap-2">
          {title}
          {meta ? <span className="truncate text-[12px] font-medium text-fg-muted">{meta}</span> : null}
        </span>
        <Icon
          name="chevron-down"
          size={16}
          className={cn(
            "text-fg-muted transition-transform duration-200 ease-pf",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="wb-fade-in flex flex-col gap-3.5 pb-2 pt-2">{children}</div>
      ) : null}
    </div>
  );
}
