"use client";

import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button, Icon, IconButton, Segmented } from "@/components/workbench";

import { PublishFooter } from "./publish-footer";
import { PublishSidebar } from "./publish-sidebar";
import { PublishTikTokFields } from "./publish-tiktok-fields";
import type { SlideshowPublishOptions } from "./types";
import type { SlideshowPublishDialog, SlideshowPublishWorkspace } from "./view-models";

/*
 * The root stays mounted while closed, so the first open is a closed-to-open change and animates like
 * every later one. The body is keyed by draft, so its options start fresh for another draft.
 */
export function PublishDialog({ dialog }: { dialog: SlideshowPublishDialog }) {
  const { open, project, onOpenChange } = dialog;
  return (
    <Dialog open={open && project !== null} onOpenChange={onOpenChange}>
      {project ? <PublishDialogBody key={project.id} dialog={dialog} project={project} /> : null}
    </Dialog>
  );
}

function PublishDialogBody({
  dialog,
  project,
}: {
  dialog: SlideshowPublishDialog;
  project: NonNullable<SlideshowPublishDialog["project"]>;
}) {
  const {
    open,
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

  const resetKey = open ? project.id : null;
  const [appliedResetKey, setAppliedResetKey] = useState<string | null>(null);
  if (resetKey !== appliedResetKey) {
    setAppliedResetKey(resetKey);
    if (open) {
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

  const copyCaption = async () => {
    await navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    window.setTimeout(() => setCaptionCopied(false), 1_500);
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
    <DialogContent
      showCloseButton={false}
      className="flex max-h-[92dvh] flex-col gap-[18px] overflow-hidden px-4 py-5 sm:max-w-[min(880px,calc(100%-2rem))] sm:px-6"
    >
      <div className="flex h-8 shrink-0 items-center justify-between gap-3">
        <DialogTitle className="text-[18px] leading-[22px] font-bold tracking-[-0.01em] text-fg">
          Publish or export
        </DialogTitle>
        <IconButton
          icon="x"
          label="Close"
          size={30}
          onClick={() => onOpenChange(false)}
        />
      </div>

      <div className="wb-scroll-fade-y wb-scroll-fade-deep wb-ring-room min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
            <div role="group" aria-label="Format" className="flex flex-col gap-2">
              <span className="wb-label">Format</span>
              <button
                type="button"
                className="wb-option font-semibold aria-pressed:font-bold"
                aria-pressed={format === "photo-carousel"}
                onClick={() => setFormat("photo-carousel")}
              >
                <span className="wb-radio">
                  <Icon name="check-chosen" size={14} strokeWidth={2.5} />
                </span>
                <span className="min-w-0 flex-1">Photo carousel</span>
              </button>
              <button
                type="button"
                className="wb-option flex-wrap font-semibold aria-pressed:font-bold"
                aria-pressed={format === "mp4"}
                onClick={() => setFormat("mp4")}
              >
                <span className="wb-radio">
                  <Icon name="check-chosen" size={14} strokeWidth={2.5} />
                </span>
                <span className="min-w-0 flex-1">MP4 video</span>
                {!supportsMp4Export ? (
                  <span className="wb-status-chip" data-tone="warn">
                    <Icon name="alert" size={14} strokeWidth={2} />
                    Renderer not connected
                  </span>
                ) : null}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="wb-label">Destination</span>
              <Segmented
                label="Destination"
                className="wb-segmented-block"
                options={DESTINATIONS}
                value={destination}
                onChange={setDestination}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="slideshow-export-caption" className="wb-label">
                  Caption
                </label>
                <Button size={32} onClick={() => void copyCaption()} disabled={!caption}>
                  {captionCopied ? <Icon name="check" strokeWidth={2} /> : null}
                  {captionCopied ? "Copied" : "Copy caption"}
                </Button>
              </div>
              <textarea
                id="slideshow-export-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={2200}
                className="wb-input min-h-28 resize-none"
                placeholder="Write a caption"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="wb-meta">
                  {format === "photo-carousel"
                    ? "Included as caption.txt in the download"
                    : "Downloaded beside the MP4"}
                </span>
                <span className="wb-mono shrink-0 text-fg-muted">
                  {caption.length} / 2200
                </span>
              </div>
            </div>

            <PublishTikTokFields publish={publish} />
          </div>

          <PublishSidebar publish={publish} />
        </div>
      </div>

      <PublishFooter publish={publish} onCancel={() => onOpenChange(false)} />
    </DialogContent>
  );
}

const DESTINATIONS = [
  { value: "download", label: "Download" },
  { value: "tiktok-draft", label: "TikTok draft" },
  { value: "tiktok-direct", label: "Publish now" },
] as const;
