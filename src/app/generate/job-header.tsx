"use client";

import {
  AlertCircle,
  ArrowLeft,
  Download,
  GalleryHorizontal,
  Loader2,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JobDetail, JobOutput } from "@/lib/generation-editor";
import { JobStatusBadge } from "./job-status-badge";
import { getEditorTitle } from "./job-enhancements";

export function JobDetailHeader({
  job,
  featured,
  isCompleted,
  isDownloading,
  error,
  onBack,
  onShare,
  onGallery,
  onDownload,
}: {
  job: JobDetail;
  featured: JobOutput | undefined;
  isCompleted: boolean;
  isDownloading: boolean;
  error: Error | null;
  onBack: () => void;
  onShare: () => void;
  onGallery: () => void;
  onDownload: () => void;
}) {
  return (
    <header className="border-b border-border bg-[var(--pf-canvas)] px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-[var(--pf-active)] hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
          </button>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <h1 className="max-w-2xl truncate text-[20px] font-semibold tracking-[-0.02em] text-foreground sm:text-[24px]">
                {getEditorTitle(job.prompt)}
              </h1>
              <JobStatusBadge status={job.status} queueStage={job.queueStage} />
            </div>
            <p className="mt-1 truncate text-[12px] text-muted-foreground">
              {job.model} · Job {job.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onShare}
            className="h-9 shrink-0 rounded-lg border-border bg-white px-3 text-[12px]"
          >
            <Share2 className="size-3.5 shrink-0" /> Share
          </Button>
          {featured && (
            <Button
              type="button"
              variant="outline"
              onClick={onGallery}
              className="h-9 shrink-0 rounded-lg border-border bg-white px-3 text-[12px]"
            >
              <GalleryHorizontal className="size-3.5 shrink-0" /> Gallery
            </Button>
          )}
          {isCompleted && featured && (
            <Button
              type="button"
              disabled={isDownloading}
              onClick={onDownload}
              className="h-9 shrink-0 rounded-lg bg-[var(--pf-orange)] px-3.5 text-[12px] text-white hover:brightness-[0.93]"
            >
              {isDownloading ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
              ) : (
                <Download className="size-3.5 shrink-0" />
              )}
              Download
            </Button>
          )}
        </div>
      </div>

      {error && job && (
        <div
          role="alert"
          className="mt-3 flex min-w-0 items-start gap-2 rounded-lg bg-[var(--pf-danger)]/10 px-3 py-2.5 text-[12px] leading-4 text-[var(--pf-danger)]"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            Live status could not refresh: {error.message}. Showing the last known state.
          </span>
        </div>
      )}
    </header>
  );
}
