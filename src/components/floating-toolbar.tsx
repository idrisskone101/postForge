import type { ReactNode } from "react";

interface FloatingToolbarProps {
  /** Desktop-only summary shown on the left side */
  summary?: ReactNode;
  /** Action buttons shown on the right side */
  children: ReactNode;
}

export function FloatingToolbar({ summary, children }: FloatingToolbarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 md:left-[calc(50%+48px)] -translate-x-1/2 z-50 flex items-center gap-4 bg-card border border-border rounded-2xl px-6 py-3 shadow-2xl backdrop-blur-xl animate-fade-in-up whitespace-nowrap">
      {summary && (
        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground pr-4 border-r border-border shrink-0">
          {summary}
        </div>
      )}
      <div className="flex items-center gap-3 shrink-0">{children}</div>
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
