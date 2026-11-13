"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { FileImage } from "@/components/file-image";
import { Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";
import type { CloneOutputReviewView } from "@/components/clone-output/types";

export function CloneOutputPlayer({ review }: { review: CloneOutputReviewView }) {
  const { featured, previewWidth, previewHeight, job } = review;
  if (!featured) return null;
  const width = previewWidth ?? 9;
  const height = previewHeight ?? 16;
  const style: CSSProperties = { aspectRatio: `${width} / ${height}` };
  const frameClass = cn(
    "relative w-full shrink-0 overflow-hidden rounded-lg bg-media",
    width > height ? "max-w-[560px]" : "max-w-[315px]"
  );
  const src = `/api/files/${featured.id}`;

  if (featured.type === "image") {
    return (
      <div className={frameClass} style={style} data-clone-output-media="image">
        <FileImage src={src} alt={job.prompt} sizes="315px" fit="contain" />
      </div>
    );
  }
  return (
    <VideoPlayer
      key={featured.id}
      src={src}
      frameClass={frameClass}
      style={style}
    />
  );
}

function VideoPlayer({
  src,
  frameClass,
  style,
}: {
  src: string;
  frameClass: string;
  style: CSSProperties;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const progress = time.duration > 0 ? (time.current / time.duration) * 100 : 0;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  return (
    <figure className={frameClass} style={style} data-clone-output-media="video">
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        muted={muted}
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
        onLoadedMetadata={(event) =>
          setTime({ current: 0, duration: event.currentTarget.duration })
        }
        onTimeUpdate={(event) =>
          setTime({
            current: event.currentTarget.currentTime,
            duration: event.currentTarget.duration,
          })
        }
        className="size-full object-contain"
      />
      {failed ? (
        <figcaption className="absolute inset-0 grid place-items-center text-[13px] text-fg-secondary">
          <span className="inline-flex items-center gap-2">
            <Icon name="alert" size={16} />
            Video could not load
          </span>
        </figcaption>
      ) : (
        <figcaption className="absolute inset-x-3 bottom-3 flex h-9 items-center gap-2.5 rounded-full bg-[var(--pf-scrim)] px-3 text-[var(--pf-on-media)]">
          <ControlButton label={playing ? "Pause" : "Play"} onClick={togglePlay}>
            {playing ? (
              <Pause className="size-3.5 fill-current" strokeWidth={1.5} />
            ) : (
              <Play className="size-3.5 fill-current" strokeWidth={1.5} />
            )}
          </ControlButton>
          <span className="relative flex h-5 min-w-0 flex-1 items-center rounded-full has-[:focus-visible]:shadow-[0_0_0_2px_var(--pf-ember)]">
            <span className="flex h-[3px] w-full overflow-hidden rounded-[3px] bg-[color-mix(in_srgb,var(--pf-on-media)_28%,transparent)]">
              <span
                className="h-[3px] rounded-[3px] bg-[var(--pf-on-media)]"
                style={{ width: `${progress}%` }}
              />
            </span>
            <input
              type="range"
              aria-label="Seek"
              min={0}
              max={time.duration || 0}
              step={0.1}
              value={time.current}
              onChange={(event) => {
                const video = videoRef.current;
                if (video) video.currentTime = Number(event.target.value);
              }}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
            />
          </span>
          <span className="shrink-0 font-mono text-[12px] leading-4 tabular-nums">
            {clock(time.current)} / {clock(time.duration)}
          </span>
          <ControlButton label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(!muted)}>
            {muted ? (
              <VolumeX className="size-3.5" strokeWidth={1.5} />
            ) : (
              <Volume2 className="size-3.5" strokeWidth={1.5} />
            )}
          </ControlButton>
          <ControlButton
            label="Full screen"
            onClick={() => void videoRef.current?.requestFullscreen?.()}
          >
            <Maximize className="size-3.5" strokeWidth={1.5} />
          </ControlButton>
        </figcaption>
      )}
    </figure>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-6 shrink-0 place-items-center rounded-full transition-[background-color] duration-[var(--pf-dur-feedback)] ease-pf hover:bg-[color-mix(in_srgb,var(--pf-on-media)_16%,transparent)] focus-visible:shadow-[0_0_0_2px_var(--pf-ember)] focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${(whole % 60).toString().padStart(2, "0")}`;
}
