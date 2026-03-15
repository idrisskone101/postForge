"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

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

export function MediaPreview({
  type,
  src,
  width,
  height,
  alt = "",
  className,
  fill = false,
}: MediaPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const markLoaded = useCallback(() => setIsLoading(false), []);

  // Handle cases where load event fires before hydration
  useEffect(() => {
    if (type === "image" && imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      markLoaded();
    }
    if (type === "video" && videoRef.current && videoRef.current.readyState >= 2) {
      markLoaded();
    }
  }, [type, markLoaded]);

  if (hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-zinc-900 text-zinc-600",
          className
        )}
        style={{ aspectRatio: width && height ? `${width}/${height}` : "1/1" }}
      >
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="size-8" />
          <span className="text-xs">Failed to load</span>
        </div>
      </div>
    );
  }

  const mediaClass = cn(
    "rounded-lg transition-opacity",
    isLoading ? "opacity-0" : "opacity-100",
    fill ? "w-full h-full object-cover" : "max-w-full max-h-full object-contain"
  );

  return (
    <div
      className={cn("relative overflow-hidden rounded-lg", className)}
      style={!fill && width && height ? { aspectRatio: `${width}/${height}` } : undefined}
    >
      {isLoading && (
        <Skeleton
          className="absolute inset-0 rounded-lg"
        />
      )}

      {type === "image" ? (
        <img
          ref={imgRef}
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
          ref={videoRef}
          src={src}
          width={width}
          height={height}
          controls
          onLoadedData={markLoaded}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={mediaClass}
        />
      )}
    </div>
  );
}
