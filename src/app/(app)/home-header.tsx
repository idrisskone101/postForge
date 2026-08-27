"use client";

import Link from "next/link";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";

const TITLE = "Home";

export function HomeHeader({ now = new Date() }: { now?: Date }) {
  const paintReady = useWindowLoadReady();
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <header className="flex flex-nowrap items-end justify-between gap-3 pt-7">
      <div className="min-w-0">
        <h1 data-home-title={paintReady ? undefined : TITLE}>
          {paintReady ? (
            <span className="block text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--pf-ink)]">
              {TITLE}
            </span>
          ) : (
            <span className="sr-only">{TITLE}</span>
          )}
        </h1>
        <p
          data-home-copy={paintReady ? undefined : todayLabel}
          className={
            paintReady
              ? "mt-1 max-w-xl text-[13px] leading-[1.35] text-[var(--pf-muted)]"
              : "mt-1 line-clamp-1 max-w-[8rem] text-[10px] leading-none text-[var(--pf-muted)]"
          }
        >
          {paintReady ? todayLabel : <span className="sr-only">{todayLabel}</span>}
        </p>
      </div>
      <Link
        href="/ugc-clone"
        prefetch={false}
        data-home-action={paintReady ? undefined : "New Clone"}
        className="pf-button-primary shrink-0"
      >
        {paintReady ? "New Clone" : <span className="sr-only">New Clone</span>}
      </Link>
    </header>
  );
}
