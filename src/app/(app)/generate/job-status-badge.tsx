"use client";

import { StatusChip, type IconName } from "@/components/workbench";
import { getGenerationStatusCopy, type JobDetail } from "@/lib/generation-editor";

export function JobStatusChip({
  status,
  queueStage,
}: {
  status: JobDetail["status"];
  queueStage: JobDetail["queueStage"];
}) {
  const { tone, icon } = TONES[status];
  return (
    <StatusChip tone={tone} icon={icon}>
      {status === "processing" && <span className="wb-live-dot size-1.5 shadow-none" />}
      {getGenerationStatusCopy(status, queueStage).label}
    </StatusChip>
  );
}

const TONES = {
  queued: { tone: "neutral", icon: "clock" },
  processing: { tone: "live", icon: undefined },
  completed: { tone: "ok", icon: "check" },
  failed: { tone: "bad", icon: "x" },
} as const satisfies Record<
  JobDetail["status"],
  { tone: "neutral" | "live" | "ok" | "bad"; icon: IconName | undefined }
>;
