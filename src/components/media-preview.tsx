"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

type MediaPreviewVariant = "card" | "work" | "detail";

interface MediaPreviewProps {
  type: "image" | "video";
  src: string;
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
  /** Use object-cover to fill container (grid thumbnails). Defaults to object-contain (lightbox). */
  fill?: boolean;
}

interface MediaPreviewFrameProps extends MediaPreviewProps {
  variant?: MediaPreviewVariant;
  actions?: ReactNode;
  showMetadata?: boolean;
  frameAspectRatio?: string;
  mediaClassName?: string;
}

export function MediaPreview({
  type,
  src,
  width,
  height,
  alt = "",
  className,
  fill = false,
}: MediaPreviewProps) {
  return (
    <MediaPreviewFrame
      type={type}
      src={src}
      width={width}
      height={height}
      alt={alt}
      className={className}
      fill={fill}
      variant={fill ? "card" : "work"}
    />
  );
}


function getAspectRatio(width?: number, height?: number) {
  if (!width || !height) {
    return undefined;
  }

  return `${width}/${height}`;
}

function getReducedRatio(width?: number, height?: number) {
  if (!width || !height) {
    return undefined;
  }

  let a = Math.abs(width);
  let b = Math.abs(height);

  while (b > 0) {
    const next = a % b;
    a = b;
    b = next;
  }

  return `${width / a}:${height / a}`;
}

function getMetadata(width?: number, height?: number) {
  const ratio = getReducedRatio(width, height);
  const resolution = width && height ? `${width} x ${height}` : undefined;

  return [ratio, resolution].filter(Boolean);
}

const frameClasses: Record<MediaPreviewVariant, string> = {
  card: "bg-zinc-950",
  work: "bg-zinc-950",
  detail: "bg-zinc-950",
};

const mediaWellClasses: Record<MediaPreviewVariant, string> = {
  card: "h-full min-h-0",
  work: "min-h-[280px]",
  detail: "h-[min(640px,calc(100dvh-14rem))] min-h-[280px] max-h-[calc(100dvh-12rem)]",
};

export function MediaPreviewFrame({
  type,
  src,
  width,
  height,
  alt = "",
  className,
  fill = false,
  variant = "work",
  actions,
  showMetadata = false,
  frameAspectRatio,
  mediaClassName,
}: MediaPreviewFrameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const markLoaded = useCallback(() => setIsLoading(false), []);
  const setImageRef = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node?.complete && node.naturalWidth > 0) {
      markLoaded();
    }
  }, [markLoaded]);
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && node.readyState >= 2) {
      markLoaded();
    }
  }, [markLoaded]);

  const aspectRatio = getAspectRatio(width, height);
  const metadata = getMetadata(width, height);
  const shouldUseAspectRatio = variant !== "detail" && (frameAspectRatio || aspectRatio);
  const mediaClass = cn(
    "rounded-lg transition-opacity",
    isLoading ? "opacity-0" : "opacity-100",
    fill ? "size-full object-cover" : "max-h-full max-w-full object-contain",
    mediaClassName
  );

  return (
    <figure
      data-media-preview-frame={variant}
      className={cn("relative overflow-hidden rounded-lg", frameClasses[variant], className)}
      style={shouldUseAspectRatio ? { aspectRatio: frameAspectRatio || aspectRatio } : undefined}
    >
      <div
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-lg",
          mediaWellClasses[variant]
        )}
      >
        {isLoading && <Skeleton className="absolute inset-0 rounded-lg" />}

        {hasError ? (
          <div className="flex flex-col items-center gap-2 text-zinc-600">
            <ImageOff className="size-8" />
            <span className="text-xs">Failed to load</span>
          </div>
        ) : type === "image" ? (
          <img
            ref={setImageRef}
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            onLoad={markLoaded}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            className={mediaClass}
          />
        ) : (
          <video
            ref={setVideoRef}
            src={src}
            width={width}
            height={height}
            preload={variant === "card" ? "metadata" : "auto"}
            controls={variant !== "card"}
            muted={variant === "card" ? true : undefined}
            playsInline
            onLoadedMetadata={variant === "card" ? markLoaded : undefined}
            onLoadedData={markLoaded}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            className={mediaClass}
          />
        )}
      </div>

      {(showMetadata || actions) && (
        <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-zinc-950 px-3 py-2 text-[10px] font-medium text-zinc-400">
          {showMetadata && metadata.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="Media metadata">
              {metadata.map((item) => (
                <span key={item} className="rounded-md bg-white/5 px-2 py-1 font-mono">
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <span />
          )}

          {actions && (
            <div data-media-preview-actions="true" className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </figcaption>
      )}
    </figure>
  );
}