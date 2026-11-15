"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { apiDelete, apiGet } from "@/lib/api/client";
import { avatarLabelMatchesSearch, getAvatarTileLabel } from "@/lib/avatar-workflow";
import type {
  Avatar,
  AvatarCreatedHandoff,
  AvatarListPage,
  AvatarPickerMode,
} from "@/lib/avatar-picker-model";
import { loadAvatars, rememberAvatars, rememberedAvatars } from "@/lib/avatar-list-cache";
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
  search,
  onModeChange,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Filters the loaded identities by the label on their tile. The field belongs to the caller. */
  search?: AvatarSearch;
  /** Tells the caller which view is showing, so a search field can leave when there is no list to filter. */
  onModeChange?: (mode: AvatarPickerMode) => void;
}) {
  const [avatars, setAvatars] = useState<Avatar[]>(() => rememberedAvatars()?.items ?? []);
  const [avatarsNextCursor, setAvatarsNextCursor] = useState<string | null>(
    () => rememberedAvatars()?.nextCursor ?? null
  );
  const [isLoading, setIsLoading] = useState(() => rememberedAvatars() === null);
  const [isLoadingMoreAvatars, setIsLoadingMoreAvatars] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setModeState] = useState<AvatarPickerMode>("grid");
  const setMode = (next: AvatarPickerMode) => {
    setModeState(next);
    onModeChange?.(next);
  };
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAvatars = async () => {
    try {
      setActionError(null);
      const page = await loadAvatars();
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

  useEffect(() => {
    if (!isLoading) rememberAvatars({ items: avatars, nextCursor: avatarsNextCursor });
  }, [isLoading, avatars, avatarsNextCursor]);

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

  const labelled = avatars.map((avatar, index) => ({
    avatar,
    label: getAvatarTileLabel(avatar.name, index),
  }));
  const query = search?.query.trim() ?? "";
  const matching = query
    ? labelled.filter((item) => avatarLabelMatchesSearch(item.label, query))
    : labelled;
  const selected = matching.find((item) => item.avatar.id === selectedId);
  const ordered = selected
    ? [selected, ...matching.filter((item) => item !== selected)]
    : matching;

  const avatarRow = (items: typeof labelled) => (
    <div className={AVATAR_ROW} style={avatarRowStyle(items.length)}>
      {items.map(({ avatar, label }) => (
        <AvatarOptionCard
          key={avatar.id}
          option={{
            avatar,
            label,
            isSelected: selectedId === avatar.id,
            onSelect: () => onSelect(avatar.id),
            onDelete: (event) => handleDelete(avatar.id, event),
          }}
        />
      ))}
    </div>
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
        <div className="wb-scroll-fade -m-1 max-h-[560px] min-w-0 flex-1 overflow-y-auto p-1 [scrollbar-width:thin]">
          {avatars.length === 0 ? (
            <EmptyState icon="characters" title="No saved Avatars yet" className="h-[216px] min-h-0" />
          ) : ordered.length === 0 ? (
            // The unfiltered row stays in the layout, unseen, so a search with no match keeps its height.
            <div className="relative">
              <div aria-hidden="true" inert className="invisible">
                {avatarRow(labelled)}
              </div>
              <EmptyState
                icon="search"
                title={avatarsNextCursor ? "No match in the characters loaded so far" : "No characters match"}
                className="absolute inset-0 min-h-0"
              >
                <Button variant="strong" onClick={search?.onClear}>
                  Clear search
                </Button>
              </EmptyState>
            </div>
          ) : (
            avatarRow(ordered)
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button size={32} onClick={() => void loadMoreAvatars()} disabled={isLoadingMoreAvatars}>
            {isLoadingMoreAvatars ? "Loading" : "Load more"}
          </Button>
          {query ? (
            <p role="status" className="min-w-0 text-[13px] leading-[18px] text-fg-secondary">
              Search covers the {avatars.length} characters loaded so far. Load more to search the rest.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export type AvatarSearch = { query: string; onClear: () => void };

const AVATAR_ROW =
  "grid grid-flow-col grid-cols-[var(--avatar-template)] gap-3 auto-cols-[max(120px,calc((100%-var(--avatar-gaps))/var(--avatar-cols)))] [[data-avatar-stacked]_&]:grid-flow-row [[data-avatar-stacked]_&]:auto-cols-auto [[data-avatar-stacked]_&]:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]";

/**
 * One row. Up to four identities share the width in equal fractions, which land on whole pixels
 * where a percentage would not; from five on, four and a part of the fifth show, so the row reads
 * as scrollable.
 */
function avatarRowStyle(count: number): CSSProperties {
  const scrolls = count > 4;
  const visible = scrolls ? 4.4 : Math.max(count, 3);
  return {
    "--avatar-cols": visible,
    "--avatar-gaps": `${(Math.ceil(visible) - 1) * 12}px`,
    "--avatar-template": scrolls ? "none" : `repeat(${visible}, minmax(120px, 1fr))`,
  } as CSSProperties;
}
