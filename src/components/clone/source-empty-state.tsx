import { type ReactNode } from "react";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceState } from "@/components/workspace-state";

export function ReferencePortraitFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-reference-portrait-frame="true"
      className={cn(
        "mx-auto flex aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-lg bg-zinc-950",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CloneSourceEmptyState() {
  return (
    <WorkspaceState
      tone="empty"
      icon={Video}
      title="Add source"
      description="Your selected clip appears here."
      className="min-h-0 border-0 bg-transparent px-0 py-0"
    />
  );
}
