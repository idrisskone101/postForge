"use client";

import type { ReactNode } from "react";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { ClonePaintText } from "./clone-paint-text";

export function CloneOwnedHeader() {
  const paintReady = useWindowLoadReady();
  const TITLE = "Clone";
  const COPY = "Turn a proven source into an on-brand creator video.";

  return (
    <header className="flex flex-nowrap items-end justify-between gap-3 pt-7">
      <div className="min-w-0">
        <h1 data-home-title={paintReady ? undefined : TITLE}>
          <ClonePaintText
            ready={paintReady}
            liveAs="span"
            liveClassName="block text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground"
            paint={<span className="sr-only">{TITLE}</span>}
          >
            {TITLE}
          </ClonePaintText>
        </h1>
        <p data-clone-copy={paintReady ? undefined : COPY} className="mt-1">
          <ClonePaintText
            ready={paintReady}
            liveAs="span"
            liveClassName="block max-w-[12rem] truncate text-[13px] leading-none text-muted-foreground"
            paint={<span className="sr-only">{COPY}</span>}
          >
            {COPY}
          </ClonePaintText>
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
