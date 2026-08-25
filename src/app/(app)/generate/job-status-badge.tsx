"use client";

import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGenerationStatusCopy, type JobDetail } from "@/lib/generation-editor";

export function JobStatusBadge({
  status,
  queueStage,
}: {
  status: JobDetail["status"];
  queueStage: JobDetail["queueStage"];
}) {
  const copy = getGenerationStatusCopy(status, queueStage);
  const completed = status === "completed";
  const failed = status === "failed";

  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold",
        completed && "bg-[var(--pf-success)]/10 text-[var(--pf-success)]",
        failed && "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]",
        status === "processing" && "bg-[var(--pf-link)]/10 text-[var(--pf-link)]",
        status === "queued" && "bg-[var(--pf-active)] text-muted-foreground"
      )}
    >
      {completed ? (
        <Check className="size-3" />
      ) : failed ? (
        <AlertCircle className="size-3" />
      ) : (
        <span
          className={cn(
            "size-1.5 rounded-full bg-current",
            status === "processing" && "animate-pulse"
          )}
        />
      )}
      {copy.label}
    </span>
  );
}
