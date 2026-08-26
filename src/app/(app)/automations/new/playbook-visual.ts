import { cn } from "@/lib/utils";

export function playbookCardShellClass(selected: boolean, previewing: boolean, listView: boolean) {
  let border = "border-[var(--pf-border)] hover:border-[var(--pf-border-strong)]";
  if (selected) {
    border = "border-[var(--pf-orange)] ring-2 ring-[var(--pf-orange)]/10";
  } else if (previewing) {
    border = "border-[var(--pf-border-strong)]";
  }
  return cn(
    "relative overflow-hidden rounded-[8px] border bg-[var(--pf-surface)] transition-colors",
    border,
    listView && "grid sm:grid-cols-[124px_minmax(0,1fr)]"
  );
}

export function playbookCategoryButtonClass(active: boolean) {
  return cn(
    "flex h-9 shrink-0 items-center justify-between gap-4 rounded-[8px] px-2.5 text-left text-[11px] font-medium transition-colors",
    active
      ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
      : "text-[var(--pf-muted)] hover:bg-[var(--pf-active)]"
  );
}

export function playbookCategoryCountClass(active: boolean) {
  return cn(
    "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
    active ? "bg-[var(--pf-surface)]/20" : "bg-[var(--pf-active)] text-[var(--pf-muted)]"
  );
}

export function playbookSelectButtonClass(selected: boolean) {
  return cn(
    "flex h-7 flex-1 items-center justify-center gap-1 rounded-[8px] text-[12px] font-semibold",
    selected
      ? "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
      : "pf-button-primary !min-h-7 !h-7 !px-2"
  );
}
