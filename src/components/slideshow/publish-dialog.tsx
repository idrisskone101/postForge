"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileImage,
  Film,
  LoaderCircle,
  Lock,
  MessageCircle,
  Music2,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import type {
  SlideshowProject,
  SlideshowPublishOptions,
} from "./types";

export function PublishDialog({
  open,
  project,
  tiktokConnected,
  supportsMp4Export,
  onOpenChange,
  onExport,
}: {
  open: boolean;
  project: SlideshowProject | null;
  tiktokConnected: boolean;
  supportsMp4Export: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (
    project: SlideshowProject,
    options: SlideshowPublishOptions,
  ) => Promise<void>;
}) {
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

  useEffect(() => {
    if (!open || !project) return;
    setCaption(
      project.caption?.trim() ||
        (project.slides[0]?.headline
          ? `${project.slides[0].headline}\n\n#creator #slideshow`
          : ""),
    );
    setError(null);
    setExported(false);
    setCaptionCopied(false);
  }, [open, project]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl! overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-6 py-5 pr-14">
          <DialogTitle className="text-xl font-semibold">Publish or export</DialogTitle>
          <DialogDescription>
            Prepare {project.slides.length} slides for download, TikTok drafts, or
            direct publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <fieldset>
              <legend className="text-xs font-semibold">Format</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFormat("photo-carousel")}
                  aria-pressed={format === "photo-carousel"}
                  className={cn(
                    "flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    format === "photo-carousel"
                      ? "border-accent-coral bg-accent-coral/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-coral/10 text-accent-coral">
                    <FileImage className="size-4" />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold">Native photo carousel</span>
                    <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
                      Keep every slide swipeable as an individual image.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("mp4")}
                  aria-pressed={format === "mp4"}
                  className={cn(
                    "relative flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    format === "mp4"
                      ? "border-accent-blue bg-accent-blue/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-blue/10 text-accent-blue">
                    <Film className="size-4" />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold">MP4 slideshow</span>
                    <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
                      Render timed slides into a ready-to-upload video.
                    </span>
                    {!supportsMp4Export ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-amber-600 dark:text-amber-300">
                        <Lock className="size-3" /> Renderer not connected
                      </span>
                    ) : null}
                  </span>
                </button>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold">Destination</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
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
                      "flex h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      destination === value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:bg-muted",
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
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="min-h-28 w-full resize-none rounded-xl border border-border bg-background p-3 text-xs leading-5 outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
                placeholder="Write a caption or let PostForge suggest one…"
              />
              <span className="mt-1 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                <span>
                  {format === "photo-carousel"
                    ? "Included as caption.txt in the carousel download."
                    : "Downloaded beside the MP4 and available to copy."}
                </span>
                <span>{caption.length}/2200</span>
              </span>
            </div>

            {publishingToTikTok ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold">Visibility</span>
                    <select
                      value={visibility}
                      onChange={(event) =>
                        setVisibility(
                          event.target.value as SlideshowPublishOptions["visibility"],
                        )
                      }
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-blue"
                    >
                      <option value="public">Everyone</option>
                      <option value="friends">Friends</option>
                      <option value="private">Only me</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold">Schedule</span>
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3">
                      <CalendarClock className="size-4 text-muted-foreground" />
                      <input
                        type="datetime-local"
                        value={scheduledFor}
                        onChange={(event) => setScheduledFor(event.target.value)}
                        disabled={!scheduleEnabled}
                        className="min-w-0 flex-1 bg-transparent text-[11px] outline-none disabled:opacity-40"
                      />
                      <Switch
                        size="sm"
                        checked={scheduleEnabled}
                        onCheckedChange={setScheduleEnabled}
                        aria-label="Schedule publishing"
                      />
                    </div>
                  </label>
                </div>

                <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-3">
                  <label className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2">
                      <MessageCircle className="size-3.5 text-muted-foreground" />
                      Comments
                    </span>
                    <Switch
                      size="sm"
                      checked={allowComments}
                      onCheckedChange={setAllowComments}
                      aria-label="Allow comments"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs">
                    <span>Duet</span>
                    <Switch
                      size="sm"
                      checked={allowDuet}
                      onCheckedChange={setAllowDuet}
                      aria-label="Allow duet"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs">
                    <span>Stitch</span>
                    <Switch
                      size="sm"
                      checked={allowStitch}
                      onCheckedChange={setAllowStitch}
                      aria-label="Allow stitch"
                    />
                  </label>
                </div>

                <div className="space-y-3 rounded-xl border border-border p-4">
                  <label className="flex items-center justify-between gap-4 text-xs">
                    <span>
                      <span className="block font-semibold">Branded content</span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        Disclose promotional or paid content.
                      </span>
                    </span>
                    <Switch
                      checked={brandedContent}
                      onCheckedChange={setBrandedContent}
                      aria-label="Disclose branded content"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 border-t border-border pt-3 text-xs">
                    <span>
                      <span className="block font-semibold">AI-generated content</span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        Apply TikTok&apos;s AI content disclosure.
                      </span>
                    </span>
                    <Switch
                      checked={aiGenerated}
                      onCheckedChange={setAiGenerated}
                      aria-label="Disclose AI generated content"
                    />
                  </label>
                </div>
              </>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div
              className={cn(
                "rounded-xl border p-4",
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
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
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

            <div className="rounded-xl border border-border bg-muted/25 p-4">
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
              <p className="rounded-lg bg-amber-500/10 p-3 text-[10px] leading-4 text-amber-700 dark:text-amber-300">
                MP4 rendering is visible for workflow parity, but remains disabled
                until a video renderer is configured.
              </p>
            ) : null}
            {destinationBlocked ? (
              <p className="rounded-lg bg-amber-500/10 p-3 text-[10px] leading-4 text-amber-700 dark:text-amber-300">
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

            <Button
              size="lg"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="w-full bg-accent-coral text-white hover:bg-[#ff6540]"
            >
              {exporting ? (
                <LoaderCircle className="animate-spin" />
              ) : destination === "download" ? (
                <Download />
              ) : scheduleEnabled ? (
                <CalendarClock />
              ) : (
                <Sparkles />
              )}
              {exporting
                ? "Preparing…"
                : destination === "download"
                  ? "Export slideshow"
                  : scheduleEnabled
                    ? "Schedule slideshow"
                    : destination === "tiktok-draft"
                      ? "Send to TikTok drafts"
                      : "Publish to TikTok"}
            </Button>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
