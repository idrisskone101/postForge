import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

type StatusChipProps = {
  tone?: "ok" | "warn" | "bad" | "neutral" | "live";
  /** Optional 14px leading icon, e.g. "check" for Connected, "alert" for Reconnect required. */
  icon?: IconName;
  children: ReactNode;
  className?: string;
};

/** Worded 24px chip for real states that must stay readable, e.g. "Reconnect required". */
export function StatusChip({ tone = "neutral", icon, children, className }: StatusChipProps) {
  return (
    <span className={cn("wb-status-chip", className)} data-tone={tone}>
      {icon && <Icon name={icon} size={14} strokeWidth={2} />}
      {children}
    </span>
  );
}
