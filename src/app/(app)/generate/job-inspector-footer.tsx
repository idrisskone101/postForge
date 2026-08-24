"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  Trash2,
  Users,
  Workflow,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  JobDetailActions,
  JobDetailViewModel,
} from "./job-enhancements";

export function JobInspectorFooter({
  view,
  actions,
}: {
  view: JobDetailViewModel;
  actions: JobDetailActions;
}) {
  const {
    job,
    featured,
    isCompleted,
    canDiscard,
    isRetrying,
    isDownloading,
    isDiscarding,
    feedback,
  } = view;
  const {
    onDownload,
    onRetry,
    onSaveToGallery,
    onUseInClone,
    onGenerateSimilar,
    onAddToAutomation,
    onDiscard,
    onLeave,
  } = actions;
  return (
    <div className="min-w-0 border-t border-border p-4 pb-[max(16px,env(safe-area-inset-bottom))] [&_[role=alert]]:min-w-0 [&_[role=alert]]:break-words [&_[role=alert]]:[overflow-wrap:anywhere] [&_[role=status]]:min-w-0 [&_[role=status]]:break-words [&_[role=status]]:[overflow-wrap:anywhere] [&_[role=alert]_svg]:shrink-0 [&_[role=status]_svg]:shrink-0">
      {isCompleted && featured ? (
        <GenerateOutputActions
          view={{
            canDownload: true,
            isRetrying,
            isDownloading,
            showRetry: false,
            actionError: feedback?.tone === "error" ? feedback.message : null,
            actionNotice: feedback?.tone === "success" ? feedback.message : null,
            onDownload,
            onRetry,
            onSaveToGallery,
            onUseInClone: job.type === "image" ? onUseInClone : undefined,
            onGenerateSimilar,
            onAddToAutomation,
          }}
        />
      ) : (
        feedback && (
          <div
            role={feedback.tone === "error" ? "alert" : "status"}
            className={cn(
              "flex min-w-0 items-start gap-2 rounded-lg px-3 py-2.5 text-[12px] leading-4",
              feedback.tone === "error"
                ? "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                : "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
            )}
          >
            {feedback.tone === "error" ? (
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            ) : (
              <Check className="mt-0.5 size-3.5 shrink-0" />
            )}
            <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
              {feedback.message}
            </span>
          </div>
        )
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {featured && job.type === "image" && (
          <Button
            type="button"
            variant="outline"
            onClick={onUseInClone}
            className="h-9 rounded-lg border-border bg-white text-[12px] xl:hidden"
          >
            <Users className="size-3.5 shrink-0" /> Use in Clone
          </Button>
        )}
        {featured && (
          <Button
            type="button"
            variant="outline"
            onClick={onAddToAutomation}
            className="h-9 rounded-lg border-border bg-white text-[12px] xl:hidden"
          >
            <Workflow className="size-3.5 shrink-0" /> Automate
          </Button>
        )}
      </div>

      {canDiscard ? (
        <AlertDialog>
          <AlertDialogTrigger
            disabled={isDiscarding}
            render={
              <button
                type="button"
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--pf-danger)]/40 text-[12px] font-semibold text-[var(--pf-danger)] transition-colors hover:bg-[var(--pf-danger)]/10 disabled:opacity-50"
              />
            }
          >
            {isDiscarding ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin" />
            ) : (
              <Trash2 className="size-3.5 shrink-0" />
            )}
            Discard generation
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard this generation?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the job and its generated files. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep generation</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={onDiscard}
              >
                Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <button
          type="button"
          onClick={onLeave}
          className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-[var(--pf-active)]"
        >
          <ArrowLeft className="size-3.5" /> Leave editor
        </button>
      )}
    </div>
  );
}
