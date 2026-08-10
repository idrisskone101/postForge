"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_CHARACTER_PHOTO = "/character-builder/default-portrait.png";

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

export function CharacterPhoto({
  avatarId,
  generatedFileId,
  alt = "Character portrait",
  className,
  onLoadError,
}: {
  avatarId?: string | null;
  generatedFileId?: string | null;
  alt?: string;
  className?: string;
  onLoadError?: () => void;
}) {
  const requestedSource = characterPhotoSource({ avatarId, generatedFileId });
  const [source, setSource] = useState(requestedSource);

  useEffect(() => {
    setSource(requestedSource);
  }, [requestedSource]);

  return (
    <span
      data-character-preview="photographic"
      className={cn("relative block size-full overflow-hidden", className)}
    >
      <Image
        src={source}
        alt={alt}
        fill
        sizes="(max-width: 640px) 92vw, 440px"
        className="object-cover"
        unoptimized
        onError={() => {
          if (source !== DEFAULT_CHARACTER_PHOTO) {
            onLoadError?.();
            setSource(DEFAULT_CHARACTER_PHOTO);
          }
        }}
      />
    </span>
  );
}

