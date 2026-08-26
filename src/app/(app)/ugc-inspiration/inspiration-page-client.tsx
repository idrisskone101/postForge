"use client";

import dynamic from "next/dynamic";
import { RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceHeaderAccessory } from "@/components/workspace-header-accessory";
import { InspirationCreatorRail } from "./inspiration-creator-rail";
import { InspirationHeaderControls } from "./inspiration-header-controls";
import { InspirationSourceLibrary } from "./inspiration-source-library";
import { useInspirationWorkspace } from "./use-inspiration-workspace";
import type { InspirationPageClientProps } from "./types";

export function InspirationPageClient(props: InspirationPageClientProps) {
  const workspace = useInspirationWorkspace(props);
  const {
    handleInput,
    setHandleInput,
    isAddingAccount,
    handleTrackAccount,
    pageError,
    setPageError,
    accounts,
    refreshingIds,
    handleRefreshAccount,
    trackedVideoCount,
    sourceUsageCounts,
    setActiveFilter,
    setSourceFeedFilter,
  } = workspace;

  return (
    <>
      <WorkspaceHeaderAccessory>
        <InspirationHeaderControls
          handleInput={handleInput}
          isAddingAccount={isAddingAccount}
          onHandleInputChange={setHandleInput}
          onTrackAccount={() => void handleTrackAccount()}
        />
      </WorkspaceHeaderAccessory>

      <div className="min-w-0">
        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 overflow-x-clip">
          <div className="mx-auto flex w-full min-w-0 max-w-[1280px] flex-col gap-5 overflow-x-clip">
            {pageError && (
              <div
                role="alert"
                className="flex min-w-0 items-start gap-3 rounded-[8px] border border-[var(--pf-danger)]/30 bg-[var(--pf-danger)]/10 px-4 py-3 text-[13px] text-[var(--pf-danger)]"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                  {pageError}
                </span>
                <button
                  type="button"
                  onClick={() => setPageError(null)}
                  className="shrink-0 text-[12px] font-semibold text-[var(--pf-danger)] hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="pf-card flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setActiveFilter("all");
                  document
                    .getElementById("tracked-creators-heading")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                title="Show all tracked creators"
                className="rounded-[8px] text-left transition-colors hover:text-[var(--pf-ink)]"
              >
                <strong className="text-[15px] font-semibold tabular-nums text-[var(--pf-ink)]">
                  {accounts.length}
                </strong>
                <span className="ml-2 text-[12px] text-[var(--pf-muted)] underline-offset-2">
                  tracked creators
                </span>
              </button>
              <span className="hidden h-6 w-px bg-[var(--pf-border)] sm:block" />
              <button
                type="button"
                onClick={() => {
                  setSourceFeedFilter("all");
                  document
                    .getElementById("source-library-heading")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                title="Show every saved source"
                className="rounded-[8px] text-left transition-colors hover:text-[var(--pf-ink)]"
              >
                <strong
                  data-lcp={String(trackedVideoCount)}
                  className="text-[15px] font-semibold tabular-nums text-[var(--pf-ink)]"
                >
                  <span className="sr-only">{trackedVideoCount}</span>
                </strong>
                <span
                  data-lcp="saved sources"
                  className="ml-2 text-[12px] text-[var(--pf-muted)]"
                >
                  <span className="sr-only">saved sources</span>
                </span>
              </button>
              <span className="hidden h-6 w-px bg-[var(--pf-border)] sm:block" />
              <button
                type="button"
                onClick={() => {
                  setSourceFeedFilter("unused");
                  document
                    .getElementById("source-library-heading")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                title="Filter the library to fresh sources"
                className="rounded-[8px] text-left transition-colors hover:text-[var(--pf-ink)]"
              >
                <strong
                  data-lcp={String(sourceUsageCounts.unused)}
                  className="text-[15px] font-semibold tabular-nums text-[var(--pf-ink)]"
                >
                  <span className="sr-only">{sourceUsageCounts.unused}</span>
                </strong>
                <span
                  data-lcp="ready to use"
                  className="ml-2 text-[12px] text-[var(--pf-muted)]"
                >
                  <span className="sr-only">ready to use</span>
                </span>
              </button>
              <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[var(--pf-muted)]">
                  <Sparkles className="size-3.5 shrink-0" />
                  <span data-lcp="Fresh posts stay at the front" className="min-w-0">
                    <span className="sr-only">Fresh posts stay at the front</span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    accounts.forEach((account) => {
                      if (!refreshingIds.includes(account.id)) {
                        void handleRefreshAccount(account.id);
                      }
                    })
                  }
                  disabled={accounts.length === 0 || refreshingIds.length > 0}
                  className="pf-button-secondary h-10 shrink-0 px-3 text-[12px]"
                  data-lcp="Refresh all"
                >
                  <RefreshCw
                    className={cn(
                      "size-4 shrink-0",
                      refreshingIds.length > 0 && "animate-spin"
                    )}
                  />
                  <span className="sr-only">Refresh all</span>
                </button>
              </div>
            </div>

            <InspirationCreatorRail workspace={workspace} />
            <InspirationSourceLibrary workspace={workspace} />
          </div>
        </section>
      </div>

      <InspirationPreviewDialog workspace={workspace} />
    </>
  );
}

const InspirationPreviewDialog = dynamic(
  () =>
    import("./inspiration-preview-dialog").then(
      (module) => module.InspirationPreviewDialog
    ),
  { ssr: false }
);
