"use client";

import { GenerateOutputActions } from "@/components/generate-output-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/workbench";
import { publishPinnedBar } from "@/lib/pinned-bar";
import { JobIcon } from "./job-icons";
import type { JobDetailActions, JobDetailViewModel } from "./job-enhancements";

export function JobActionDock({
  view,
  actions,
}: {
  view: JobDetailViewModel;
  actions: JobDetailActions;
}) {
  const { job, featured, isCompleted, isFailed, canDiscard, isRetrying, isDownloading, isDiscarding } = view;

  return (
    <div ref={publishPinnedBar} className={DOCK_BAR}>
      <div
        role="toolbar"
        aria-label="Generation actions"
        className="flex flex-wrap items-center justify-between gap-2 rounded-[28px] bg-raised p-2 shadow-float sm:h-14 sm:flex-nowrap sm:rounded-[var(--pf-radius-pill)] sm:py-0"
      >
        {canDiscard ? (
          <AlertDialog>
            <AlertDialogTrigger
              disabled={isDiscarding}
              render={
                <button
                  type="button"
                  className="wb-btn wb-btn-40 bg-transparent px-4 text-bad hover:bg-bad-tint disabled:text-fg-disabled"
                />
              }
            >
              {isDiscarding ? "Discarding…" : "Discard"}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard this generation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the job and its generated files. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel variant="secondary">Keep generation</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={actions.onDiscard}>
                  Discard
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <span aria-hidden="true" />
        )}

        {isCompleted && featured && (
          <GenerateOutputActions
            view={{
              canDownload: true,
              isRetrying,
              isDownloading,
              showRetry: false,
              onDownload: actions.onDownload,
              onRetry: actions.onRetry,
              onSaveToGallery: actions.onSaveToGallery,
              onUseInClone: job.type === "image" ? actions.onUseInClone : undefined,
              onAddToAutomation: actions.onAddToAutomation,
            }}
          />
        )}

        {isFailed && (
          <Button variant="primary" size={40} onClick={actions.onRetry} disabled={isRetrying}>
            <JobIcon name="retry" strokeWidth={2} />
            {isRetrying ? "Retrying…" : "Retry"}
          </Button>
        )}

        {!canDiscard && (
          <Button variant="outline" size={40} onClick={actions.onLeave}>
            Leave editor
          </Button>
        )}
      </div>
    </div>
  );
}

/*
 * Below 1280 the dock is pinned to the viewport bottom on the page floor, and the page fades out above
 * it. A window under 680px tall has no room to pin it, so there it stays in flow under the preview.
 */
const DOCK_BAR = [
  "wb-stuck-fade sticky bottom-0 z-20 flex-none bg-floor pb-[max(12px,env(safe-area-inset-bottom))] [--wb-stuck-fade-color:var(--pf-floor)]",
  "max-xl:order-2 xl:static xl:bg-transparent xl:pb-0",
  "[@media(max-height:679.98px)]:static [@media(max-height:679.98px)]:pb-0 [@media(max-height:679.98px)]:before:hidden [@media(max-height:679.98px)]:max-xl:order-none",
].join(" ");
