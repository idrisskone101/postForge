"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { FileJson, Trash2 } from "lucide-react";
import { getAvatarIdentityPackStatusLabel, getAvatarOriginLabel } from "@/lib/avatar-workflow";
import type { Avatar } from "@/lib/avatar-picker-model";
import { cn } from "@/lib/utils";
import { buttonClass, Icon, IconButton, Skeleton } from "@/components/workbench";

export function AvatarActionErrorNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div role="alert" className="wb-notice wb-fade-in items-start py-2 pr-2" data-tone="bad">
      <p className="min-w-0 flex-1 break-words pt-[5px] text-bad [overflow-wrap:anywhere]">
        {message}
      </p>
      <IconButton
        icon="x"
        label="Dismiss avatar error"
        variant="ghost"
        size={28}
        onClick={onDismiss}
        className="shrink-0 text-bad"
      />
    </div>
  );
}

export function AvatarCreationCard({
  isUploading,
  onUpload,
  onGenerate,
  onGallery,
  onImport,
}: {
  isUploading: boolean;
  onUpload: () => void;
  onGenerate: () => void;
  onGallery: () => void;
  onImport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);

  const openChooser = () => {
    setOpen(true);
    requestAnimationFrame(() => firstActionRef.current?.focus());
  };
  const closeChooser = () => {
    setOpen(false);
    requestAnimationFrame(() => toggleRef.current?.focus());
  };

  const actions: { key: string; label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }[] = [
    {
      key: "upload",
      label: isUploading ? "Uploading" : "Upload",
      icon: <Icon name="upload" size={16} />,
      onClick: onUpload,
      disabled: isUploading,
    },
    { key: "generate", label: "Generate", icon: <Icon name="generate" size={16} />, onClick: onGenerate },
    { key: "import", label: "Import", icon: <FileJson className="size-4" strokeWidth={1.5} />, onClick: onImport },
    { key: "gallery", label: "Gallery", icon: <Icon name="gallery" size={16} />, onClick: onGallery },
  ];

  return (
    <div
      data-avatar-creation="true"
      className="w-full shrink-0 rounded-lg bg-raised @[640px]:h-[216px] @[640px]:w-[132px]"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.stopPropagation();
          closeChooser();
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        hidden={open}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={openChooser}
        className="flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-lg border-0 bg-transparent text-fg @[640px]:h-full @[640px]:flex-col @[640px]:gap-2.5"
      >
        <span className="grid size-9 place-items-center rounded-full bg-strong text-strong-fg">
          <Icon name="plus" size={16} />
        </span>
        <span className="text-[13px] font-semibold leading-4">New avatar</span>
      </button>

      <div id={menuId} hidden={!open} className="wb-fade-in flex flex-col gap-1.5 p-2.5">
        <div className="flex items-center justify-between pl-1">
          <span className="text-[13px] font-semibold leading-4 text-fg">New avatar</span>
          <IconButton icon="x" label="Close new avatar options" variant="ghost" size={28} onClick={closeChooser} />
        </div>
        <div className="grid grid-cols-2 gap-1.5 @[640px]:grid-cols-1">
          {actions.map((action, index) => (
            <button
              key={action.key}
              ref={index === 0 ? firstActionRef : undefined}
              type="button"
              data-avatar-action={action.key}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(buttonClass("outline", 32, true), "justify-start")}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export type AvatarOptionView = {
  avatar: Avatar;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (event: React.MouseEvent) => void;
};

export function AvatarOptionCard({ option }: { option: AvatarOptionView }) {
  const { avatar, label, isSelected, onSelect, onDelete } = option;
  const originLabel = getAvatarOriginLabel(avatar.origin);
  const identityStatusLabel = getAvatarIdentityPackStatusLabel(avatar.identityPack);
  const identityFailed = avatar.identityPack?.status === "failed";
  let metaTone = isSelected ? "text-fg-secondary" : "text-fg-muted";
  if (identityFailed) metaTone = "text-bad";

  return (
    <div data-avatar-option={avatar.id} className="group/avatar relative flex min-w-0 flex-col gap-2">
      <button
        type="button"
        aria-label={label}
        aria-pressed={isSelected}
        onClick={onSelect}
        data-selected={isSelected ? "true" : undefined}
        className="wb-tile h-[216px] w-full cursor-pointer border-0 p-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/avatars/${avatar.id}`} alt="" loading="lazy" decoding="async" />
        <span className="wb-tile-check" aria-hidden="true">
          <Icon name="check" size={12} strokeWidth={3} />
        </span>
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${label}`}
        title={`Delete ${label}`}
        className="absolute right-2 top-2 z-[3] grid size-7 cursor-pointer place-items-center rounded-full border-0 bg-[var(--pf-scrim)] text-[var(--pf-on-media)] opacity-0 transition-[opacity,background-color] duration-[var(--pf-dur-feedback)] ease-pf hover:bg-bad focus-visible:opacity-100 group-hover/avatar:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Trash2 className="size-3.5" strokeWidth={1.5} />
      </button>

      <div className="flex min-w-0 flex-col">
        <p
          className={cn(
            "truncate text-[14px] leading-[18px] text-fg",
            isSelected ? "font-bold" : "font-semibold"
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "text-[12px] leading-4",
            metaTone
          )}
        >
          {originLabel ? `${originLabel} · ` : ""}
          {identityStatusLabel}
        </p>
      </div>
    </div>
  );
}

export function AvatarPickerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading avatars" className="@container">
      <div className="flex flex-col gap-3 @[640px]:flex-row">
        <div className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton shape="tile" className="h-[216px]" />
              <Skeleton className="w-3/5" />
            </div>
          ))}
        </div>
        <Skeleton shape="tile" className="h-14 w-full @[640px]:h-[216px] @[640px]:w-[132px]" />
      </div>
    </div>
  );
}
