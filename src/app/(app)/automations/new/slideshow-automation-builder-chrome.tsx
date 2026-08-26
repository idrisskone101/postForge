"use client";

import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";

export function SlideshowAutomationBuilderChrome({
  existing,
}: {
  existing: boolean;
}) {
  return (
    <>
      <Link
        href="/automations"
        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] text-[13px] font-semibold text-[var(--pf-muted)] transition hover:text-[var(--pf-ink)]"
      >
        <ArrowLeft className="size-3.5" />
        Automations
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[8px] bg-[var(--pf-active)] text-[var(--pf-muted)]">
          <Layers className="size-4.5" />
        </span>
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--pf-ink)]">
            {existing ? "Edit slideshow automation" : "New slideshow automation"}
          </h1>
          <p className="mt-0.5 text-[11px] text-[var(--pf-muted)]">
            {existing
              ? "Update the source, hook pool, visuals, and schedule for future runs."
              : "Define the hook pool and schedule. Generated runs stay in Slideshow Drafts for review."}
          </p>
        </div>
      </div>
    </>
  );
}
