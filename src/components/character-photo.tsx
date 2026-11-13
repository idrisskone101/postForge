"use client";

import { useState } from "react";
import { characterPortraitSrcSet } from "@/app/(app)/characters/portrait/portrait-url";
import { cn } from "@/lib/utils";

export function CharacterPhoto({
  avatarId,
  generatedFileId,
  alt = "Character portrait",
  className,
  onLoadError,
  priority = false,
  sizes,
}: {
  avatarId?: string | null;
  generatedFileId?: string | null;
  alt?: string;
  className?: string;
  onLoadError?: () => void;
  priority?: boolean;
  sizes?: string;
}) {
  const requestedSource = characterPhotoSource({ avatarId, generatedFileId });
  const [failure, setFailure] = useState<PhotoFailure | null>(null);
  const failedHere = failure?.source === requestedSource ? failure.stage : null;
  const source = failedHere === "original" ? DEFAULT_CHARACTER_PHOTO : requestedSource;
  const srcSet =
    sizes && avatarId && !generatedFileId && failedHere === null
      ? characterPortraitSrcSet(avatarId)
      : undefined;

  return (
    <span
      data-character-preview="photographic"
      data-character-default-frame={
        source === DEFAULT_CHARACTER_PHOTO ? "true" : undefined
      }
      className={cn(className)}
      style={PHOTO_FRAME_STYLE}
    >
      <img
        src={source}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        width={390}
        height={520}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        style={PHOTO_IMAGE_STYLE}
        onError={() => {
          if (source === DEFAULT_CHARACTER_PHOTO) return;
          if (srcSet) {
            setFailure({ source: requestedSource, stage: "resized" });
            return;
          }
          onLoadError?.();
          setFailure({ source: requestedSource, stage: "original" });
        }}
      />
    </span>
  );
}

type PhotoFailure = { source: string; stage: "resized" | "original" };

const DEFAULT_CHARACTER_PHOTO = "/character-builder/default-portrait.webp";

const PHOTO_FRAME_STYLE = {
  position: "relative",
  display: "block",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  backgroundColor: "var(--pf-media)",
} as const;

const PHOTO_IMAGE_STYLE = {
  position: "absolute",
  inset: 0,
  display: "block",
  width: "100%",
  height: "100%",
  maxWidth: "100%",
  objectFit: "cover",
  verticalAlign: "middle",
} as const;

function characterPhotoSource({
  avatarId,
  generatedFileId,
}: {
  avatarId?: string | null;
  generatedFileId?: string | null;
}) {
  if (generatedFileId) {
    return `/api/files/${encodeURIComponent(generatedFileId)}`;
  }
  if (avatarId) {
    return `/api/avatars/${encodeURIComponent(avatarId)}`;
  }
  return DEFAULT_CHARACTER_PHOTO;
}
