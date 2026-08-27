"use client";

import type { ReactNode } from "react";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";

export function CloneOwnedHeader() {
  const TITLE = "Clone";
  const COPY = "Turn a proven source into an on-brand creator video.";

  return (
    <header className="flex flex-nowrap items-end justify-between gap-3 pt-7">
      <div className="min-w-0">
        <h1 data-home-title={TITLE}>
          <span className="sr-only">{TITLE}</span>
        </h1>
        <p data-clone-copy={COPY} className="mt-1">
          <span className="sr-only">{COPY}</span>
        </p>
      </div>
    </header>
  );
}

export function CloneStudioFrame({
  children,
}: {
  children: ReactNode;
}) {
  const paintReady = useWindowLoadReady();
  return (
    <div data-clone-studio={paintReady ? undefined : "true"}>{children}</div>
  );
}
