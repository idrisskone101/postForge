"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";
import type { CloneSetupStep } from "@/components/clone/types";
import type { CloneDraft } from "@/components/clone/view-models";

export function CloneLiveComposition({
  draft,
}: {
  draft: CloneDraft;
}) {
  const {
    activeSetupStep,
    videoInfo,
    sourcePreviewSrc,
    avatarId,
    selectedSavedReference: selectedReference,
    selectedGeneratedReference,
    collectionReferenceUrl,
    sourceReady,
    identityReady,
    referenceReady,
    onSelectStep,
  } = draft;
  const referencePreview = collectionReferenceUrl ?? selectedReference?.previewUrl ??
    (selectedGeneratedReference?.status === "completed" && selectedGeneratedReference.fileId
      ? `/api/files/${selectedGeneratedReference.fileId}`
      : null);
  const avatarPreview = avatarId
    ? `/api/avatars/${encodeURIComponent(avatarId)}`
    : null;
  const sourceThumb = videoInfo
    ? `/api/ugc-clone/sources/${encodeURIComponent(videoInfo.id)}/thumbnail`
    : null;

  const slots: {
    id: CloneSetupStep;
    label: string;
    ready: boolean;
    thumb: string | null;
  }[] = [
    { id: "source", label: "Source", ready: sourceReady, thumb: sourceThumb },
    { id: "identity", label: "Identity", ready: identityReady, thumb: avatarPreview },
    { id: "reference", label: "Reference", ready: referenceReady, thumb: referencePreview },
  ];

  return (
    <aside
      data-clone-live-composition="true"
      aria-label="Live composition"
      className="wb-panel gap-3"
    >
      <div className="flex h-7 shrink-0 items-center justify-between gap-3">
        <h2 className="wb-panel-title">Live composition</h2>
        <span className="inline-flex h-6 items-center rounded-full bg-raised px-2.5 text-[12px] font-semibold leading-4 text-fg-secondary">
          9:16 · Fit
        </span>
      </div>

      <div className="flex h-[344px] shrink-0 items-center justify-center gap-3.5 rounded-lg bg-well">
        <div className="relative flex h-[304px] w-[171px] shrink-0 overflow-hidden rounded-lg bg-media">
          {referencePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={referencePreview}
              alt="Selected clone reference"
              className="size-full object-contain"
            />
          ) : avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt="Selected clone identity"
              className="size-full object-cover"
            />
          ) : sourcePreviewSrc && videoInfo ? (
            <CompositionVideo
              clip={{ src: sourcePreviewSrc, width: videoInfo.width, height: videoInfo.height }}
            />
          ) : (
            <span className="grid size-full place-items-center rounded-lg border border-dashed border-edge text-fg-muted">
              <Icon name="clone" size={20} />
            </span>
          )}
          {videoInfo ? (
            <span className="wb-tile-duration pointer-events-none left-2 right-auto">
              {formatClock(videoInfo.durationSec)}
            </span>
          ) : null}
        </div>

        <div className="flex w-[118px] shrink-0 flex-col gap-2">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelectStep(slot.id)}
              aria-current={activeSetupStep === slot.id ? "step" : undefined}
              aria-label={`${slot.label}: ${slot.ready ? "ready" : "required"}. Edit ${slot.label}.`}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-raised p-2 text-left text-[12px] font-semibold leading-4 text-fg",
                "transition-[box-shadow,background-color] duration-[160ms] ease-pf hover:bg-raised-strong",
                "aria-[current=step]:shadow-[0_0_0_2px_var(--pf-ember)]"
              )}
            >
              {slot.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slot.thumb}
                  alt=""
                  className="size-7 shrink-0 rounded-sm bg-media object-cover"
                />
              ) : (
                <span className="grid size-7 shrink-0 place-items-center rounded-sm border border-dashed border-edge text-fg-secondary">
                  <Icon name="plus" size={12} strokeWidth={2} />
                </span>
              )}
              <span className="min-w-0 truncate">{slot.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

/**
 * The source clip in the live composition. The frame is one button that
 * toggles playback, so there are no native browser controls on the tile.
 */
function CompositionVideo({
  clip,
}: {
  clip: { src: string; width: number; height: number };
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const Glyph = playing ? Pause : Play;

  return (
    <button
      type="button"
      aria-label={playing ? "Pause source preview" : "Play source preview"}
      onClick={() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) void video.play();
        else video.pause();
      }}
      className="group relative block size-full overflow-hidden rounded-lg outline-none after:pointer-events-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:shadow-[inset_0_0_0_2px_var(--pf-ember)]"
    >
      <video
        ref={videoRef}
        src={clip.src}
        width={clip.width}
        height={clip.height}
        muted
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="size-full object-cover"
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--pf-scrim)] text-[var(--pf-on-media)]",
          "transition-opacity duration-[160ms] ease-pf",
          playing && "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
        )}
      >
        <Glyph className={cn("size-4 fill-current", !playing && "translate-x-px")} strokeWidth={1.5} />
      </span>
    </button>
  );
}

function formatClock(sec: number) {
  const total = Math.round(sec);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}
