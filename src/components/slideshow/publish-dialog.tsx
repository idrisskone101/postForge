"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileImage,
  Film,
  Lock,
  Music2,
  Send,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { PublishSidebar } from "./publish-sidebar";
import { PublishTikTokFields } from "./publish-tiktok-fields";
import type { SlideshowPublishOptions } from "./types";
import type { SlideshowPublishDialog, SlideshowPublishWorkspace } from "./view-models";

export function PublishDialog({ dialog }: { dialog: SlideshowPublishDialog }) {
  const {
    open,
    project,
    tiktokConnected,
    supportsMp4Export,
    onOpenChange,
    onExport,
  } = dialog;
  const [format, setFormat] = useState<SlideshowPublishOptions["format"]>(
    "photo-carousel",
  );
  const [destination, setDestination] = useState<
    SlideshowPublishOptions["destination"]
  >("download");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<
    SlideshowPublishOptions["visibility"]
  >("public");
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  const resetKey = open && project ? project.id : null;
  const [appliedResetKey, setAppliedResetKey] = useState<string | null>(null);
  if (resetKey !== appliedResetKey) {
    setAppliedResetKey(resetKey);
    if (open && project) {
      setCaption(
        project.caption?.trim() ||
          (project.slides[0]?.headline
            ? `${project.slides[0].headline}\n\n#creator #slideshow`
            : ""),
      );
      setError(null);
      setExported(false);
      setCaptionCopied(false);
    }
  }

  if (!project) return null;

  const publishingToTikTok = destination !== "download";
  const destinationBlocked = publishingToTikTok && !tiktokConnected;
  const formatBlocked = format === "mp4" && !supportsMp4Export;
  const canSubmit = !destinationBlocked && !formatBlocked && !exporting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setExporting(true);
    setError(null);
    setExported(false);
    try {
      await onExport(project, {
        format,
        destination,
        caption,
        visibility,
        allowComments,
        allowDuet,
        allowStitch,
        brandedContent,
        aiGenerated,
        scheduledFor:
          scheduleEnabled && scheduledFor ? new Date(scheduledFor).toISOString() : null,
      });
      setExported(true);
      if (destination === "download") {
        window.setTimeout(() => onOpenChange(false), 900);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not prepare this slideshow.",
      );
    } finally {
      setExporting(false);
    }
  };

  const publish: SlideshowPublishWorkspace = {
    publishingToTikTok,
    visibility,
    onVisibilityChange: setVisibility,
    scheduledFor,
    onScheduledForChange: setScheduledFor,
    scheduleEnabled,
    onScheduleEnabledChange: setScheduleEnabled,
    allowComments,
    onAllowCommentsChange: setAllowComments,
    allowDuet,
    onAllowDuetChange: setAllowDuet,
    allowStitch,
    onAllowStitchChange: setAllowStitch,
    brandedContent,
    onBrandedContentChange: setBrandedContent,
    aiGenerated,
    onAiGeneratedChange: setAiGenerated,
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
    onSubmit: () => void handleSubmit(),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl! overflow-y-auto rounded-lg border-border p-0">
        <DialogHeader className="border-b border-border px-6 py-5 pr-14">
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Publish or export</DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground">
            Prepare {project.slides.length} slides for download, TikTok drafts, or
            direct publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <fieldset>
              <legend className="text-[12px] font-semibold text-muted-foreground">Format</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFormat("photo-carousel")}
                  aria-pressed={format === "photo-carousel"}
                  className={cn(
                    "flex min-h-24 items-start gap-3 rounded-[6px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    format === "photo-carousel"
                      ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)]"
                      : "border-border bg-white hover:border-[var(--pf-border-strong)]",
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--pf-orange)]/10 text-[var(--pf-orange)]">
                    <FileImage className="size-4" />
                  </span>
                  <span>
                    <span className="block text-[12px] font-semibold text-foreground">Native photo carousel</span>
                    <span className="mt-1 block text-[12px] leading-4 text-muted-foreground">
                      Keep every slide swipeable as an individual image.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("mp4")}
                  aria-pressed={format === "mp4"}
                  className={cn(
                    "relative flex min-h-24 items-start gap-3 rounded-[6px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    format === "mp4"
                      ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)]"
                      : "border-border bg-white hover:border-[var(--pf-border-strong)]",
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-blue/10 text-accent-blue">
                    <Film className="size-4" />
                  </span>
                  <span>
                    <span className="block text-[12px] font-semibold text-foreground">MP4 slideshow</span>
                    <span className="mt-1 block text-[12px] leading-4 text-muted-foreground">
                      Render timed slides into a ready-to-upload video.
                    </span>
                    {!supportsMp4Export ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-300">
                        <Lock className="size-3" /> Renderer not connected
                      </span>
                    ) : null}
                  </span>
                </button>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-[12px] font-semibold text-muted-foreground">Destination</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["download", "Download", Download],
                    ["tiktok-draft", "TikTok draft", Music2],
                    ["tiktok-direct", "Publish now", Send],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDestination(value)}
                    aria-pressed={destination === value}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      destination === value
                        ? "border-[var(--pf-ink)] bg-[var(--pf-ink)] text-white"
                        : "border-border bg-white text-muted-foreground hover:border-[var(--pf-border-strong)] hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
                <label htmlFor="slideshow-export-caption">Caption</label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={async () => {
                    await navigator.clipboard.writeText(caption);
                    setCaptionCopied(true);
                    window.setTimeout(() => setCaptionCopied(false), 1_500);
                  }}
                  disabled={!caption}
                >
                  {captionCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {captionCopied ? "Copied" : "Copy caption"}
                </button>
              </span>
              <textarea
                id="slideshow-export-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={2200}
                className="min-h-28 w-full resize-none rounded-lg border border-border bg-card p-3 text-[12px] leading-5 outline-none transition focus:border-[var(--pf-orange)] focus:ring-2 focus:ring-[var(--pf-orange)]/10"
                placeholder="Write a caption or let PostForge suggest one..."
              />
              <span className="mt-1 flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
                <span>
                  {format === "photo-carousel"
                    ? "Included as caption.txt in the carousel download."
                    : "Downloaded beside the MP4 and available to copy."}
                </span>
                <span>{caption.length}/2200</span>
              </span>
            </div>

            <PublishTikTokFields publish={publish} />

          </div>

          <PublishSidebar publish={publish} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
