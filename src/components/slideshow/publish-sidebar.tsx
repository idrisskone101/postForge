"use client";

import {
  CalendarClock,
  Check,
  Download,
  ExternalLink,
  LoaderCircle,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { SlideshowProject, SlideshowPublishOptions } from "./types";

export function PublishSidebar({
  project,
  tiktokConnected,
  format,
  destination,
  formatBlocked,
  destinationBlocked,
  canSubmit,
  exporting,
  error,
  exported,
  scheduleEnabled,
  onSubmit,
}: {
  project: SlideshowProject;
  tiktokConnected: boolean;
  format: SlideshowPublishOptions["format"];
  destination: SlideshowPublishOptions["destination"];
  formatBlocked: boolean;
  destinationBlocked: boolean;
  canSubmit: boolean;
  exporting: boolean;
  error: string | null;
  exported: boolean;
  scheduleEnabled: boolean;
  onSubmit: () => void;
}) {
  return (
          <aside className="space-y-4">
            <div
              className={cn(
                "rounded-[6px] border p-4",
                tiktokConnected
                  ? "border-accent-green/30 bg-accent-green/5"
                  : "border-amber-500/25 bg-amber-500/5",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    tiktokConnected
                      ? "bg-accent-green/10 text-accent-green"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-300",
                  )}
                >
                  {tiktokConnected ? (
                    <ShieldCheck className="size-4" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                </span>
                <div>
                  <p className="text-xs font-semibold">
                    {tiktokConnected ? "TikTok connected" : "TikTok not connected"}
                  </p>
                  <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
                    {tiktokConnected
                      ? "Direct posts and TikTok drafts are available."
                      : "Connect an approved TikTok Content Posting account to enable dispatch."}
                  </p>
                  {!tiktokConnected ? (
                    <Button variant="outline" size="sm" className="mt-3" disabled>
                      Connect account
                      <ExternalLink />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[6px] border border-border bg-[var(--pf-active)] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Slides</span>
                <span className="font-semibold">{project.slides.length}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Ratio</span>
                <span className="font-semibold">{project.aspectRatio}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Format</span>
                <span className="font-semibold">
                  {format === "photo-carousel" ? "Photo carousel" : "MP4"}
                </span>
              </div>
            </div>

            {formatBlocked ? (
              <p className="rounded-lg bg-amber-500/10 p-3 text-[12px] leading-4 text-amber-700 dark:text-amber-300">
                MP4 rendering is visible for workflow parity, but remains disabled
                until a video renderer is configured.
              </p>
            ) : null}
            {destinationBlocked ? (
              <p className="rounded-lg bg-amber-500/10 p-3 text-[12px] leading-4 text-amber-700 dark:text-amber-300">
                TikTok publishing is disabled until an approved account and posting
                scope are connected. Download remains available now.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </p>
            ) : null}
            {exported ? (
              <p role="status" className="flex items-center gap-2 rounded-lg bg-accent-green/10 p-3 text-xs font-medium text-accent-green">
                <Check className="size-4" />
                Slideshow prepared successfully.
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void onSubmit()}
              disabled={!canSubmit}
              className="pf-button-primary h-11 w-full"
            >
              {exporting ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : destination === "download" ? (
                <Download className="size-3.5" />
              ) : scheduleEnabled ? (
                <CalendarClock className="size-3.5" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {exporting
                ? "Preparing..."
                : destination === "download"
                  ? "Export slideshow"
                  : scheduleEnabled
                    ? "Schedule slideshow"
                    : destination === "tiktok-draft"
                      ? "Send to TikTok drafts"
                      : "Publish to TikTok"}
            </button>
          </aside>
  );
}
