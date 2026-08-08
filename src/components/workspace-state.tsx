import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

function StateActionControl({
  action,
  primary,
}: {
  action: StateAction;
  primary?: boolean;
}) {
  const className = cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98]",
    primary
      ? "bg-accent-coral text-white shadow-[var(--pf-shadow-orange)] transition-[filter] hover:brightness-[0.93]"
      : "border border-border bg-background text-muted-foreground shadow-[var(--pf-shadow-2xs)] hover:border-accent-coral/40 hover:text-foreground"
  );

  const content = (
    <>
      {action.label}
      {primary && <ArrowRight className="size-4" />}
    </>
  );

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {content}
    </button>
  );
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
      className={cn(
        "flex min-h-[240px] min-w-0 flex-col items-center justify-center rounded-lg border bg-card/60 px-5 py-10 text-center",
        tone === "empty" && "border-dashed border-border bg-white/[0.01]",
        tone === "error" && "border-destructive/30 bg-destructive/10",
        tone === "neutral" && "border-border",
        className
      )}
    >
      <div
        className={cn(
          "mb-5 flex size-14 items-center justify-center rounded-2xl shadow-[var(--pf-shadow-xs)] ring-1",
          tone === "error"
            ? "bg-destructive/12 text-destructive ring-destructive/15"
            : "bg-accent-blue/12 text-accent-blue ring-accent-blue/15"
        )}
      >
        <Icon className="size-6" />
      </div>
      <h2
        className={cn(
          "max-w-full break-words text-lg font-semibold tracking-tight [overflow-wrap:anywhere]",
          tone === "error" && "text-destructive"
        )}
      >
        {title}
      </h2>
      <p className="mt-2 min-w-0 max-w-md break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && <StateActionControl action={action} primary />}
          {secondaryAction && <StateActionControl action={secondaryAction} />}
        </div>
      )}
    </div>
  );
}

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
      className={cn(
        "rounded-lg border border-border bg-card/60 p-5",
        preserveHeightClassName,
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">
        {title}
      </p>
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            data-state-skeleton-line="true"
            className={cn(
              "h-4 rounded-md",
              index === 0 && "w-full max-w-xl",
              index === 1 && "w-5/6 max-w-lg",
              index >= 2 && "w-2/3 max-w-md"
            )}
          />
        ))}
      </div>
      {actions > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: actions }).map((_, index) => (
            <Skeleton
              key={index}
              data-state-skeleton-action="true"
              className="h-10 w-32 rounded-lg"
            />
          ))}
        </div>
      )}
    </div>
  );
}
