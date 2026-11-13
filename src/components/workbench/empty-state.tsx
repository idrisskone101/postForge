import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

type EmptyStateProps = {
  icon: IconName;
  title: string;
  /** Only for real state the title cannot carry, e.g. an error detail. */
  detail?: string;
  /** One `strong` 36px button, optionally one quiet one. */
  children?: ReactNode;
  tone?: "empty" | "error";
  className?: string;
};

/** Dashed 12px tile: icon, one line, one action. Fades in once. */
export function EmptyState({
  icon,
  title,
  detail,
  tone = "empty",
  children,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("wb-empty", className)} data-tone={tone}>
      <span className="wb-empty-icon">
        <Icon name={icon} size={20} />
      </span>
      <p className="wb-empty-title">{title}</p>
      {detail ? <p className="wb-empty-copy">{detail}</p> : null}
      {children ? <div className="wb-empty-actions">{children}</div> : null}
    </div>
  );
}
