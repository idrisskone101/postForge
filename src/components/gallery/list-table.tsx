"use client";

import { MediaPreviewFrame } from "@/components/media-preview";
import { Icon } from "@/components/workbench/icon";
import { IconButton } from "@/components/workbench/icon-button";
import { StatusBadge } from "@/components/workbench/status-badge";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import {
  formatGalleryDuration,
  galleryItemKind,
  galleryItemModel,
  galleryItemName,
  galleryItemSize,
  galleryItemTitle,
  reviewStatusLabel,
  reviewStatusTone,
} from "./format";
import type { GalleryMediaSession } from "./media-session";
import type { GalleryItem } from "./types";

export function GalleryListTable({
  items,
  session,
}: {
  items: GalleryItem[];
  session: GalleryMediaSession;
}) {
  const { selectedIds, toggleSelection, openPreview, downloadItem } = session;
  const showSize = items.some((item) => galleryItemSize(item) !== null);

  return (
    <div data-gallery-view="list" className="wb-fade-in flex min-w-0 flex-col">
      <div className="wb-table-head max-md:hidden" aria-hidden="true">
        <span className="w-[22px] shrink-0" />
        <span className="min-w-0 flex-1">Output</span>
        <span className="w-12 shrink-0">Status</span>
        {showSize && <span className="w-[88px] shrink-0">Size</span>}
        <span className="w-[60px] shrink-0">Duration</span>
        <span className="w-[100px] shrink-0">Created</span>
        <span className="w-14 shrink-0" />
      </div>
      <ul className="flex min-w-0 flex-col">
        {items.map((item) => {
          const selected = selectedIds.has(item.id);
          const title = galleryItemTitle(item);
          const name = galleryItemName(item);
          return (
            <li
              key={item.id}
              onClick={() => openPreview(item)}
              className={cn(
                "wb-row cursor-pointer gap-3 transition-[background-color] duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised/60 md:gap-4",
                selected && "rounded-lg border-transparent bg-raised hover:bg-raised"
              )}
            >
              <RowCheck
                selected={selected}
                name={name}
                onToggle={() => toggleSelection(item.id)}
              />
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="wb-thumb relative">
                  <MediaPreviewFrame
                    type={item.type}
                    src={item.url}
                    width={item.width}
                    height={item.height}
                    alt=""
                    cover
                    variant="card"
                    className="size-full rounded-none bg-media"
                    mediaClassName="rounded-none object-cover"
                    thumbnail={{ sizes: "40px" }}
                  />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openPreview(item);
                    }}
                    className="wb-row-title max-w-full min-w-0 self-start text-left"
                    title={title}
                  >
                    {title}
                  </button>
                  <span className="wb-row-sub">
                    {galleryItemKind(item)} - {galleryItemModel(item)}
                  </span>
                </div>
              </div>
              <span className="w-12 shrink-0 max-md:w-auto">
                <StatusBadge
                  tone={reviewStatusTone[item.reviewStatus.value]}
                  label={reviewStatusLabel[item.reviewStatus.value]}
                />
              </span>
              {showSize && (
                <span className="wb-mono w-[88px] shrink-0 text-fg-secondary max-md:hidden">
                  {galleryItemSize(item) ?? "-"}
                </span>
              )}
              <span className="wb-mono w-[60px] shrink-0 text-fg-secondary max-md:hidden">
                {formatGalleryDuration(item.durationSec) ?? "-"}
              </span>
              <span
                className="wb-mono w-[100px] shrink-0 text-fg-secondary max-md:hidden"
                suppressHydrationWarning
              >
                {formatRelativeDate(item.createdAt)}
              </span>
              <span
                className="flex w-14 shrink-0 items-center justify-end gap-1.5 max-md:w-auto"
                onClick={(event) => event.stopPropagation()}
              >
                <IconButton
                  icon="download"
                  label={`Download ${name}`}
                  size={30}
                  onClick={() => void downloadItem(item)}
                />
                <Icon name="chevron-right" size={16} className="text-fg-muted max-md:hidden" />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RowCheck({
  selected,
  name,
  onToggle,
}: {
  selected: boolean;
  name: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`Select ${name}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className="-m-[11px] flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full"
    >
      <span
        className={cn(
          "flex size-[22px] items-center justify-center rounded-full transition-[background-color,box-shadow] duration-[var(--pf-dur-feedback)] ease-pf",
          selected
            ? "bg-ember text-[var(--pf-on-ember)]"
            : "shadow-[inset_0_0_0_1.5px_var(--pf-outline)]"
        )}
      >
        {selected && <Icon name="check" size={12} strokeWidth={3} className="animate-[wb-check-in_var(--pf-dur-feedback)_var(--pf-ease)_both]" />}
      </span>
    </button>
  );
}
