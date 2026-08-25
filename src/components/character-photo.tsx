"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_CHARACTER_PHOTO = "/character-builder/default-portrait.webp";

const PHOTO_FRAME_STYLE = {
  position: "relative",
  display: "block",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  backgroundColor: "#111113",
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

export function CharacterPhoto({
  avatarId,
  generatedFileId,
  alt = "Character portrait",
  className,
  onLoadError,
  priority = false,
}: {
  avatarId?: string | null;
  generatedFileId?: string | null;
  alt?: string;
  className?: string;
  onLoadError?: () => void;
  priority?: boolean;
}) {
  const requestedSource = characterPhotoSource({ avatarId, generatedFileId });
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source =
    failedSource === requestedSource
      ? DEFAULT_CHARACTER_PHOTO
      : requestedSource;

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
        alt={alt}
        width={390}
        height={520}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        style={PHOTO_IMAGE_STYLE}
        onError={() => {
          if (source !== DEFAULT_CHARACTER_PHOTO) {
            onLoadError?.();
            setFailedSource(requestedSource);
          }
        }}
      />
    </span>
  );
}

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
