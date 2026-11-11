"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DEMO_BLOCKED_HEADER } from "@/lib/demo/mode";

/**
 * Demo builds only. Routes report a refused request in their own way (or not
 * at all), so this watches every response and says once, in one place, why the
 * action did nothing.
 */
export function DemoBlockedNotice() {
  const [notice, setNotice] = useState<{ kind: DemoRefusal; at: number } | null>(null);

  useEffect(
    () => observeRefusedRequests((kind) => setNotice({ kind, at: Date.now() })),
    []
  );

  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (notice === null) return null;
  const copy = NOTICE_COPY[notice.kind];

  return (
    <div
      role="status"
      aria-live="polite"
      data-demo-notice="true"
      className="pf-card fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[70] flex items-start gap-3 p-4 shadow-[var(--pf-shadow-lg)] sm:left-auto sm:w-[380px]"
    >
      <i aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--pf-ink)]">
          {copy.title}
        </p>
        <p className="mt-0.5 text-[12px] leading-[1.4] text-[var(--pf-muted)]">
          {copy.body}
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setNotice(null)}
        className="grid size-7 shrink-0 place-items-center rounded-[6px] text-[var(--pf-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)]"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

const VISIBLE_MS = 7_000;

type DemoRefusal = "blocked" | "limited";

const NOTICE_COPY: Record<DemoRefusal, { title: string; body: string }> = {
  blocked: {
    title: "Turned off in the demo",
    body: "Generation, uploads, and external connections are disabled here. You can still browse and edit the sample content.",
  },
  limited: {
    title: "Too many edits right now",
    body: "The demo limits how fast its sample content can be changed. Try again in a minute.",
  },
};

function observeRefusedRequests(onRefused: (kind: DemoRefusal) => void) {
  const original = window.fetch;
  const observed: typeof window.fetch = async (...args) => {
    const response = await original.apply(window, args);
    const refusal = response.headers.get(DEMO_BLOCKED_HEADER);
    if (refusal === "blocked" || refusal === "limited") onRefused(refusal);
    return response;
  };
  window.fetch = observed;
  return () => {
    if (window.fetch === observed) window.fetch = original;
  };
}
