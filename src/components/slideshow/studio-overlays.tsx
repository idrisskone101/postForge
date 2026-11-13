"use client";

import { Meter } from "@/components/workbench/meter";

import type { StudioCreatorProgress } from "./studio-creator-generate";

export function StudioCreatorProgressOverlay({
  progress,
}: {
  progress: StudioCreatorProgress;
}) {
  const percent = progress.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[var(--pf-backdrop)] p-4"
    >
      <div className="wb-panel wb-fade-in w-full max-w-[420px] gap-4 p-6">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="wb-panel-title">Generating slide visuals</p>
          <p className="wb-meta truncate">{progress.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <Meter
            label="Slide visuals ready"
            value={percent}
            running
            className="h-1.5"
          />
          <span className="wb-mono text-fg-secondary">
            {progress.completed} / {progress.total}
          </span>
        </div>
        <p className="wb-meta">
          Keep this tab open. The editor opens when the last image is ready.
        </p>
      </div>
    </div>
  );
}
