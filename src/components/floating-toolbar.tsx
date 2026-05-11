import type { ReactNode } from "react";

interface FloatingToolbarProps {
  /** Desktop-only summary shown on the left side */
  summary?: ReactNode;
  /** Action buttons shown on the right side */
  children: ReactNode;
}

export function FloatingToolbar({ summary, children }: FloatingToolbarProps) {
  return (
    <div className="sticky bottom-4 z-30 mt-6 ml-auto flex w-full flex-col items-stretch gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-xl animate-fade-in-up sm:w-auto sm:max-w-fit sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      {summary && (
        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground pr-4 border-r border-border shrink-0">
          {summary}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">{children}</div>
    </div>
  );
}

/** Pipe-separated label for toolbar summary sections */
export function ToolbarLabel({ children }: { children: ReactNode }) {
  return <span className="font-mono">{children}</span>;
}

export function ToolbarDivider() {
  return <span className="text-border">|</span>;
}

export function ToolbarHeading({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider">
      {children}
    </span>
  );
}
