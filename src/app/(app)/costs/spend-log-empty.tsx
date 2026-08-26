"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { DollarSign } from "lucide-react";
import { WorkspaceState } from "@/components/workspace-state";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";

export function SpendLogEmpty({
  emptyPeriod,
  onClearFilters,
}: {
  emptyPeriod: boolean;
  onClearFilters: () => void;
}) {
  const paintReady = useWindowLoadReady();
  const title = emptyPeriod ? "No cost log entries yet" : "No matching cost log entries";
  const description = emptyPeriod
    ? "Create production work to populate Spend with cost entries."
    : "Try a different model filter or search term.";

  return (
    <>
      <div aria-hidden={paintReady || undefined} style={paintReady ? HIDDEN_SHELL : undefined}>
        <WorkspaceState
          tone="empty"
          icon={DollarSign}
          title={title}
          description={description}
          action={
            emptyPeriod
              ? { href: "/ugc-clone", label: "Start Clone" }
              : { label: "Clear filters", onClick: onClearFilters }
          }
          secondaryAction={emptyPeriod ? { href: "/generate", label: "Open Generate" } : undefined}
          className="min-h-56 border-0 bg-transparent"
        />
      </div>
      {paintReady ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
          <div className="grid size-14 place-items-center rounded-[8px] bg-[var(--pf-active)] text-[var(--pf-muted)]">
            <DollarSign className="size-6" />
          </div>
          <h2 className="max-w-sm text-[16px] font-semibold leading-6 text-[var(--pf-ink)] [overflow-wrap:anywhere]">
            {title}
          </h2>
          <p className="max-w-md text-[13px] leading-5 text-[var(--pf-muted)] [overflow-wrap:anywhere]">
            {description}
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            {emptyPeriod ? (
              <>
                <Link href="/ugc-clone" className="pf-button-primary">
                  Start Clone
                </Link>
                <Link href="/generate" className="pf-button-secondary">
                  Open Generate
                </Link>
              </>
            ) : (
              <button type="button" onClick={onClearFilters} className="pf-button-primary">
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

const HIDDEN_SHELL: CSSProperties = {
  position: "absolute",
  width: 0,
  height: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
};
