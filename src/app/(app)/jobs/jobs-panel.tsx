import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function JobsPanel({
  className,
  children,
  ...props
}: ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "min-w-0 gap-0 overflow-hidden rounded-lg border border-border bg-card py-0 text-card-foreground shadow-none ring-0",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export const JOBS_HAIRLINE_CSS = `[data-jobs-summary="true"] a{border:1px solid var(--pf-border);border-radius:8px;background:var(--pf-surface)}[data-jobs-filters="true"],[data-jobs-board="true"]{border:1px solid var(--pf-border);border-radius:8px;background:var(--pf-surface);box-sizing:border-box}`;
