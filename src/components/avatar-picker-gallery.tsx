"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import type {
  Avatar,
  AvatarCreatedHandoff,
  AvatarGalleryFile,
} from "@/lib/avatar-picker-model";
import { userErrorMessage } from "@/lib/user-error-message";
import { EmptyState, Skeleton } from "@/components/workbench";
import { AvatarActionErrorNotice } from "@/components/avatar-picker-cards";
import { AvatarPickerModeHead } from "@/components/avatar-picker-mode-head";

export function AvatarGalleryPanel({ handoff }: { handoff: AvatarCreatedHandoff }) {
  const { onCreated, onBack } = handoff;
  const [galleryFiles, setGalleryFiles] = useState<AvatarGalleryFile[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);
  const [savingFileId, setSavingFileId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoadingGallery(true);
    setActionError(null);
    apiGet<AvatarGalleryFile[]>("/api/files?type=image&limit=50")
      .then((files) => {
        if (!active) return;
        setGalleryFiles(files);
      })
      .catch((err) => {
        console.error("Failed to load gallery:", err);
        if (!active) return;
        setActionError(userErrorMessage(err, "Failed to load gallery images."));
      })
      .finally(() => {
        if (active) setIsLoadingGallery(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePickFromGallery = async (fileId: string) => {
    setSavingFileId(fileId);
    setActionError(null);
    try {
      const avatar = await apiPost<Avatar>("/api/avatars/from-generation", {
        fileId,
        name: "Gallery Import",
      });
      onCreated(avatar);
    } catch (err) {
      console.error("Failed to save gallery image as avatar:", err);
      setActionError(userErrorMessage(err, "Gallery image could not be saved as an avatar."));
    } finally {
      setSavingFileId(null);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <AvatarPickerModeHead title="Pick from gallery" onBack={onBack} />
      {actionError && (
        <AvatarActionErrorNotice
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}

      {isLoadingGallery ? (
        <div aria-busy="true" aria-label="Loading gallery images" className={GALLERY_GRID}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} shape="tile" className="aspect-[3/4]" />
          ))}
        </div>
      ) : galleryFiles.length === 0 ? (
        <EmptyState icon="gallery" title="No generated images yet" />
      ) : (
        <div className="-m-1 max-h-[600px] overflow-y-auto p-1">
        <div className={GALLERY_GRID}>
          {galleryFiles.map((file) => {
            const isSaving = savingFileId === file.id;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => handlePickFromGallery(file.id)}
                disabled={isSaving}
                aria-label={`Use ${file.filename} as avatar`}
                className="wb-tile aspect-[3/4] w-full cursor-pointer border-0 p-0 disabled:cursor-progress [&:focus-visible>.wb-tile-actions]:translate-y-0 [&:focus-visible>.wb-tile-actions]:opacity-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/files/${file.id}`} alt="" loading="lazy" decoding="async" />
                {isSaving ? (
                  <span className="absolute inset-0 z-[3] flex items-end gap-2 bg-[var(--pf-scrim)] p-2.5 text-[12px] font-semibold leading-4 text-[var(--pf-on-media)]">
                    <span className="wb-live-dot mb-1" />
                    Saving
                  </span>
                ) : (
                  <span className="wb-tile-actions" aria-hidden="true">
                    <span className="wb-tile-action">Use as avatar</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}

const GALLERY_GRID = "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3";
