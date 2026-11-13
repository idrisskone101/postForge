import type { ReactNode } from "react";
import { Button } from "@/components/workbench";
import { cn } from "@/lib/utils";

/** One field of the References panel: 12/600 label, optional Clear, then the 48px select row. */
export function ReferenceField({
  label,
  onClear,
  className,
  children,
}: {
  label: string;
  onClear?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex h-4 items-center justify-between gap-2">
        <span className="wb-label">{label}</span>
        {onClear ? (
          <Button variant="link" className="h-4 min-h-0 text-[12px]" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
