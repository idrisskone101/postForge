"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, User } from "lucide-react";
import { apiDelete, apiGet } from "@/lib/api/client";
import { getAvatarOptionLabel } from "@/lib/avatar-workflow";
import type { Avatar, AvatarListPage, AvatarPickerMode } from "@/lib/avatar-picker-model";
import { userErrorMessage } from "@/lib/user-error-message";
import {
  AvatarActionErrorNotice,
  AvatarCreationCard,
  AvatarOptionCard,
} from "@/components/avatar-picker-cards";
import { AvatarGalleryPanel } from "@/components/avatar-picker-gallery";
import { AvatarGeneratePanel } from "@/components/avatar-picker-generate";
import { AvatarImportMode } from "@/components/avatar-picker-import-mode";

export function AvatarPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [avatarsNextCursor, setAvatarsNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMoreAvatars, setIsLoadingMoreAvatars] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<AvatarPickerMode>("grid");
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAvatars = async () => {
    try {
      setActionError(null);
      const page = await apiGet<AvatarListPage>("/api/avatars");
      setAvatars(page.items);
      setAvatarsNextCursor(page.nextCursor);
    } catch (err) {
      console.error("Failed to load avatars:", err);
      setActionError(userErrorMessage(err, "Failed to load saved identities."));
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreAvatars = async () => {
    if (!avatarsNextCursor || isLoadingMoreAvatars) return;
    setIsLoadingMoreAvatars(true);
    setActionError(null);
    try {
      const page = await apiGet<AvatarListPage>(
        `/api/avatars?cursor=${encodeURIComponent(avatarsNextCursor)}`
      );
      setAvatars((current) => {
        const seen = new Set(current.map((avatar) => avatar.id));
        return [...current, ...page.items.filter((avatar) => !seen.has(avatar.id))];
      });
      setAvatarsNextCursor(page.nextCursor);
    } catch (err) {
      console.error("Failed to load avatars:", err);
      setActionError(userErrorMessage(err, "Failed to load saved identities."));
    } finally {
      setIsLoadingMoreAvatars(false);
    }
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setActionError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(/\.[^.]+$/, ""));

      const response = await fetch("/api/avatars", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const avatar = await response.json();
      setAvatars((prev) => [avatar, ...prev]);
      onSelect(avatar.id);
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      setActionError(userErrorMessage(err, "Avatar upload failed."));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError(null);
    try {
      await apiDelete(`/api/avatars/${id}`);
      setAvatars((prev) => prev.filter((a) => a.id !== id));
      if (selectedId === id) {
        onSelect("");
      }
    } catch (err) {
      console.error("Failed to delete avatar:", err);
      setActionError(userErrorMessage(err, "Avatar could not be deleted."));
    }
  };

  const handleCreated = (avatar: Avatar) => {
    setAvatars((prev) => [avatar, ...prev]);
    onSelect(avatar.id);
    setMode("grid");
  };

  const backToGrid = () => setMode("grid");

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  switch (mode) {
    case "generate":
      return <AvatarGeneratePanel onCreated={handleCreated} onBack={backToGrid} />;
    case "gallery":
      return <AvatarGalleryPanel onCreated={handleCreated} onBack={backToGrid} />;
    case "import":
      return <AvatarImportMode onCreated={handleCreated} onBack={backToGrid} />;
    case "grid":
      break;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }

  const selectedAvatar = avatars.find((avatar) => avatar.id === selectedId);
  const orderedAvatars = (
    selectedAvatar
      ? [selectedAvatar, ...avatars.filter((avatar) => avatar.id !== selectedAvatar.id)]
      : avatars
  );

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {actionError && (
        <AvatarActionErrorNotice
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}

      <div className="grid max-h-[520px] grid-cols-2 gap-3 overflow-y-auto pr-1 2xl:grid-cols-3">
        {orderedAvatars.map((avatar, index) => {
          const isSelected = selectedId === avatar.id;
          const sourceIndex = avatars.findIndex((candidate) => candidate.id === avatar.id);
          const avatarLabel = getAvatarOptionLabel(sourceIndex >= 0 ? sourceIndex : index);
          return (
            <AvatarOptionCard
              key={avatar.id}
              avatar={avatar}
              label={avatarLabel}
              isSelected={isSelected}
              onSelect={() => onSelect(avatar.id)}
              onDelete={(event) => handleDelete(avatar.id, event)}
            />
          );
        })}

        {orderedAvatars.length === 0 && (
          <div className="flex min-h-[168px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 py-6 text-muted-foreground">
            <User className="mb-2 size-7" />
            <p className="text-xs font-semibold">No saved identities yet</p>
          </div>
        )}

        <AvatarCreationCard
          isUploading={isUploading}
          onUpload={() => fileInputRef.current?.click()}
          onGenerate={() => setMode("generate")}
          onGallery={() => setMode("gallery")}
          onImport={() => setMode("import")}
        />
      </div>
      {avatarsNextCursor && (
        <button
          type="button"
          onClick={() => void loadMoreAvatars()}
          disabled={isLoadingMoreAvatars}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-[12px] font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingMoreAvatars && <Loader2 className="size-3.5 animate-spin" />}
          {isLoadingMoreAvatars ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}
