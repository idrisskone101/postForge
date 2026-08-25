"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_CHARACTER_PHOTO = "/character-builder/default-portrait.webp";

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
      className={cn(
        "relative block size-full overflow-hidden bg-[#111113]",
        className,
      )}
    >
      <Image
        src={source}
        alt={alt}
        fill
        sizes="(max-width: 640px) 92vw, 440px"
        className="object-cover"
        unoptimized
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
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
