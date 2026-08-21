"use client";

import { AlertCircle, FileJson, Image as ImageIcon, Loader2, Sparkles, Trash2, Upload, X } from "lucide-react";
import { getAvatarIdentityPackStatusLabel, getAvatarOriginLabel } from "@/lib/avatar-workflow";
import type { Avatar } from "@/lib/avatar-picker-model";
import { cn } from "@/lib/utils";

export function AvatarActionErrorNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex min-w-0 items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1 break-words text-xs leading-5 [overflow-wrap:anywhere]">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="grid size-6 shrink-0 place-items-center rounded-md transition-colors hover:bg-destructive/10"
        aria-label="Dismiss avatar error"
      >
        <X className="size-3.5" />
      </button>
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
  return (
    <div className="flex min-h-[168px] flex-col rounded-xl border border-dashed border-border bg-muted/25 p-2.5">
      <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg bg-muted/35 text-center">
        <Sparkles className="size-6 text-muted-foreground/70" />
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          New Avatar
        </p>
        <p className="mt-1 text-[12px] leading-4 text-muted-foreground/70">
          Upload, generate, import, or choose from gallery.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-avatar-action="upload"
          onClick={onUpload}
          disabled={isUploading}
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted/35 px-2 text-muted-foreground transition-all hover:border-accent-green hover:text-accent-green active:scale-[0.97] disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span className="text-[13px] font-semibold">Upload</span>
        </button>

        <button
          type="button"
          data-avatar-action="generate"
          onClick={onGenerate}
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted/35 px-2 text-muted-foreground transition-all hover:border-accent-blue hover:text-accent-blue active:scale-[0.97]"
        >
          <Sparkles className="size-4" />
          <span className="text-[13px] font-semibold">Generate</span>
        </button>

        <button
          type="button"
          data-avatar-action="import"
          onClick={onImport}
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted/35 px-2 text-muted-foreground transition-all hover:border-accent-green hover:text-accent-green active:scale-[0.97]"
        >
          <FileJson className="size-4" />
          <span className="text-[13px] font-semibold">Import</span>
        </button>

        <button
          type="button"
          data-avatar-action="gallery"
          onClick={onGallery}
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted/35 px-2 text-muted-foreground transition-all hover:border-accent-coral hover:text-accent-coral active:scale-[0.97]"
        >
          <ImageIcon className="size-4" />
          <span className="text-[13px] font-semibold">Gallery</span>
        </button>
      </div>
    </div>
  );
}

export function AvatarOptionCard({
  avatar,
  label,
  isSelected,
  onSelect,
  onDelete,
}: {
  avatar: Avatar;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (event: React.MouseEvent) => void;
}) {
  const originLabel = getAvatarOriginLabel(avatar.origin);
  const identityStatusLabel = getAvatarIdentityPackStatusLabel(avatar.identityPack);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-muted/35 p-2.5 shadow-[var(--pf-shadow-2xs)] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        isSelected
          ? "border-accent-green shadow-[0_0_0_2px_rgba(22,163,74,0.16),var(--pf-shadow-sm)]"
          : "border-border hover:-translate-y-0.5 hover:border-accent-green/45 hover:bg-muted/55 hover:shadow-[var(--pf-shadow-md)]"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left"
      >
        <div className="aspect-[4/3] overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/avatars/${avatar.id}`}
            alt={label}
            className="size-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-semibold text-foreground">
            {label}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-1 text-[12px] font-bold uppercase tracking-widest",
              isSelected
                ? "bg-accent-green/15 text-accent-green"
                : "bg-muted/40 text-muted-foreground"
            )}
          >
            {isSelected ? "Active" : "Select"}
          </span>
        </div>

        <div className="mt-2 flex min-h-5 flex-wrap items-center gap-1.5">
          {originLabel && (
            <span className="rounded-full border border-border bg-muted/45 px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              {originLabel}
            </span>
          )}
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider",
              avatar.identityPack?.status === "completed"
                ? "border-accent-green/25 bg-accent-green/10 text-accent-green"
                : avatar.identityPack?.status === "failed"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-accent-blue/25 bg-accent-blue/10 text-accent-blue"
            )}
          >
            {identityStatusLabel}
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition-opacity hover:bg-destructive focus:opacity-100 group-hover:opacity-100"
        aria-label={`Delete ${label}`}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
