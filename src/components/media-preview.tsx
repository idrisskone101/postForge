"use client";

import { useState } from "react";
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
}

export function MediaPreview({
  type,
  src,
  width,
  height,
  alt = "",
  className,
}: MediaPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {isLoading && (
        <Skeleton
          className="absolute inset-0 rounded-lg"
          style={{
            aspectRatio: width && height ? `${width}/${height}` : "1/1",
          }}
        />
      )}

      {type === "image" ? (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={cn(
            "w-full rounded-lg object-cover transition-opacity",
            isLoading ? "opacity-0" : "opacity-100"
          )}
        />
      ) : (
        <video
          src={src}
          width={width}
          height={height}
          controls
          onLoadedData={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={cn(
            "w-full rounded-lg transition-opacity",
            isLoading ? "opacity-0" : "opacity-100"
          )}
        />
      )}
    </div>
  );
}
