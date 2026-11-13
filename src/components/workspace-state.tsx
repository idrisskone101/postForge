import Link from "next/link";
import type { ComponentType } from "react";
import { buttonClass } from "@/components/workbench/button";
import { Skeleton } from "@/components/workbench/skeleton";
import { cn } from "@/lib/utils";

type WorkspaceStateTone = "empty" | "error" | "neutral";

type StateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

interface WorkspaceStateProps {
  tone?: WorkspaceStateTone;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: StateAction;
  secondaryAction?: StateAction;
  className?: string;
}

interface WorkspaceStateSkeletonProps {
  title: string;
  lines?: number;
  actions?: number;
  preserveHeightClassName?: string;
  className?: string;
}

export function WorkspaceState({
  tone = "neutral",
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: WorkspaceStateProps) {
  return (
    <div
      data-workspace-state={tone}
      data-tone={tone === "error" ? "error" : undefined}
      role={tone === "error" ? "alert" : undefined}
      className={cn("wb-empty", className)}
    >
      <span className="wb-empty-icon">
        <Icon className="size-5" />
      </span>
      <h2 className="wb-empty-title">{title}</h2>
      <p className="wb-empty-copy">{description}</p>
      {(action || secondaryAction) && (
        <div data-workspace-state-actions="true" className="wb-empty-actions">
          {action && <StateActionControl action={action} primary />}
          {secondaryAction && <StateActionControl action={secondaryAction} />}
        </div>
      )}
    </div>
  );
}

function StateActionControl({
  action,
  primary,
}: {
  action: StateAction;
  primary?: boolean;
}) {
  const className = buttonClass(primary ? "strong" : "quiet", 36);

  if (action.href) {
    return (
      <Link prefetch={false} href={action.href} className={className}>
        {/* prefetch-off: state actions sit in empty and error surfaces, not primary nav */}
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

const SKELETON_LINE_WIDTHS = ["w-full max-w-xl", "w-5/6 max-w-lg", "w-2/3 max-w-md"];

export function WorkspaceStateSkeleton({
  title,
  lines = 3,
  actions = 1,
  preserveHeightClassName,
  className,
}: WorkspaceStateSkeletonProps) {
  return (
    <div
      data-workspace-state="loading"
      role="status"
      aria-label={title}
      className={cn("wb-panel", preserveHeightClassName, className)}
    >
      <div className="flex flex-col gap-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={SKELETON_LINE_WIDTHS[Math.min(index, SKELETON_LINE_WIDTHS.length - 1)]}
          />
        ))}
      </div>
      {actions > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: actions }).map((_, index) => (
            <Skeleton key={index} shape="tile" className="h-9 w-32 rounded-full" />
          ))}
        </div>
      )}
    </div>
  );
}
