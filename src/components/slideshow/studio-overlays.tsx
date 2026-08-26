"use client";

import { Check, LoaderCircle } from "lucide-react";

import type { StudioCreatorProgress } from "./studio-creator-generate";

export function StudioToast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-[100] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2.5 pf-card px-4 py-3 text-[13px] font-semibold text-foreground shadow-[var(--pf-shadow-lg)]"
    >
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-green/10 text-accent-green">
        <Check className="size-3.5" />
      </span>
      {message}
    </div>
  );
}

export function StudioDraftsLoading() {
  return (
    <span className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[12px] text-muted-foreground shadow-[var(--pf-shadow-md)]">
      <LoaderCircle className="size-3 animate-spin" /> Loading drafts
    </span>
  );
}

export function StudioCreatorProgressOverlay({
  progress,
}: {
  progress: StudioCreatorProgress;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-[var(--pf-canvas)] px-6"
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <span className="mb-6 grid size-14 place-items-center rounded-full bg-[var(--pf-active)] text-white">
          <LoaderCircle className="size-6 animate-spin" />
        </span>
        <p className="text-[15px] font-bold text-foreground">Generating your slide visuals</p>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {progress.title}
        </p>
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-[var(--pf-active)] transition-all duration-500"
            style={{
              width: `${(progress.completed / progress.total) * 100}%`,
            }}
          />
        </div>
        <p className="mt-3 font-mono text-[12px] tabular-nums text-muted-foreground">
          {progress.completed}/{progress.total} visuals ready
        </p>
        <p className="mt-6 text-[12px] leading-5 text-muted-foreground">
          Keep this tab open. We open your slideshow the moment the images are ready.
        </p>
      </div>
    </div>
  );
}
