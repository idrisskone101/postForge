import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
  labels,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-border bg-[var(--pf-surface)] px-2 text-[11px] text-[var(--pf-ink)] outline-none focus:border-[var(--pf-orange)]"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels?.[option] ?? option}
        </option>
      ))}
    </select>
  );
}

export function ValidationRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full",
          ok ? "bg-[var(--pf-success)]/10 text-[var(--pf-success)]" : "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
        )}
      >
        {ok ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0" />}
      </span>
      <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{text}</span>
    </div>
  );
}
