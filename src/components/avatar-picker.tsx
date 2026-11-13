"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { apiDelete, apiGet } from "@/lib/api/client";
import { getAvatarOptionLabel } from "@/lib/avatar-workflow";
import type {
  Avatar,
  AvatarCreatedHandoff,
  AvatarListPage,
  AvatarPickerMode,
} from "@/lib/avatar-picker-model";
import { userErrorMessage } from "@/lib/user-error-message";
import {
  AvatarActionErrorNotice,
  AvatarCreationCard,
  AvatarOptionCard,
  AvatarPickerSkeleton,
} from "@/components/avatar-picker-cards";
import { Button, EmptyState } from "@/components/workbench";
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
  const createdHandoff: AvatarCreatedHandoff = {
    onCreated: handleCreated,
    onBack: backToGrid,
  };

  if (isLoading) {
    return <AvatarPickerSkeleton />;
  }

  switch (mode) {
    case "generate":
      return <AvatarGeneratePanel onCreated={handleCreated} onBack={backToGrid} />;
    case "gallery":
      return <AvatarGalleryPanel handoff={createdHandoff} />;
    case "import":
      return <AvatarImportMode handoff={createdHandoff} />;
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
    <div className="flex min-w-0 flex-col gap-3">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start [[data-avatar-stacked]_&]:flex-col [[data-avatar-stacked]_&]:items-stretch">
        <div className="-m-1 max-h-[560px] min-w-0 flex-1 snap-x snap-proximity overflow-y-auto p-1 [scroll-padding-inline:4px]">
          {orderedAvatars.length === 0 ? (
            <EmptyState icon="characters" title="No saved Avatars yet" className="h-[216px] min-h-0" />
          ) : (
            <div className={AVATAR_ROW} style={avatarRowStyle(orderedAvatars.length)}>
              {orderedAvatars.map((avatar, index) => {
          const isSelected = selectedId === avatar.id;
          const sourceIndex = avatars.findIndex((candidate) => candidate.id === avatar.id);
          const avatarLabel = getAvatarOptionLabel(sourceIndex >= 0 ? sourceIndex : index);
          return (
            <AvatarOptionCard
              key={avatar.id}
              option={{
                avatar,
                label: avatarLabel,
                isSelected,
                onSelect: () => onSelect(avatar.id),
                onDelete: (event) => handleDelete(avatar.id, event),
              }}
            />
          );
              })}
            </div>
          )}
        </div>

        <AvatarCreationCard
          isUploading={isUploading}
          onUpload={() => fileInputRef.current?.click()}
          onGenerate={() => setMode("generate")}
          onGallery={() => setMode("gallery")}
          onImport={() => setMode("import")}
        />
      </div>
      {avatarsNextCursor && (
        <Button
          size={32}
          onClick={() => void loadMoreAvatars()}
          disabled={isLoadingMoreAvatars}
          className="self-start"
        >
          {isLoadingMoreAvatars ? "Loading" : "Load more"}
        </Button>
      )}
    </div>
  );
}

const AVATAR_ROW =
  "grid grid-flow-col gap-3 auto-cols-[max(120px,calc((100%-var(--avatar-gaps))/var(--avatar-cols)))] [[data-avatar-stacked]_&]:grid-flow-row [[data-avatar-stacked]_&]:auto-cols-auto [[data-avatar-stacked]_&]:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]";

/**
 * One row. Up to four identities share the width; from five on, four and a
 * part of the fifth show, so the row reads as scrollable.
 */
function avatarRowStyle(count: number): CSSProperties {
  const visible = count > 4 ? 4.4 : Math.max(count, 3);
  return {
    "--avatar-cols": visible,
    "--avatar-gaps": `${(Math.ceil(visible) - 1) * 12}px`,
  } as CSSProperties;
}
