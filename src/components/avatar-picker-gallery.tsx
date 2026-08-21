"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Image as ImageIcon, Loader2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/client";
import type {
  Avatar,
  AvatarCreatedHandoff,
  AvatarGalleryFile,
} from "@/lib/avatar-picker-model";
import { userErrorMessage } from "@/lib/user-error-message";
import { AvatarActionErrorNotice } from "@/components/avatar-picker-cards";

export function AvatarGalleryPanel({ onCreated, onBack }: AvatarCreatedHandoff) {
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
    <div className="space-y-4">
      {actionError && (
        <AvatarActionErrorNotice
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to avatars
      </button>

      {isLoadingGallery ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : galleryFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <ImageIcon className="size-8 mb-2" />
          <p className="text-sm">No generated images yet</p>
          <p className="text-xs mt-1">Generate some images first, then pick them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {galleryFiles.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => handlePickFromGallery(file.id)}
              disabled={savingFileId === file.id}
              className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-border transition-all hover:border-accent-green/50"
            >
              <img
                src={`/api/files/${file.id}`}
                alt={file.filename}
                className="size-full object-cover"
              />
              {savingFileId === file.id && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="size-6 text-white animate-spin" />
                </div>
              )}
              <div className="absolute inset-0 bg-accent-green/0 group-hover:bg-accent-green/10 transition-colors flex items-center justify-center">
                <Check className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
