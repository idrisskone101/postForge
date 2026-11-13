"use client";

import Link from "next/link";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MediaPreviewFrame } from "@/components/media-preview";
import { Button, buttonClass } from "@/components/workbench/button";
import { Icon } from "@/components/workbench/icon";
import { iconButtonClass } from "@/components/workbench/icon-button";
import { KeyValueList } from "@/components/workbench/key-value-list";
import { StatusChip } from "@/components/workbench/status-chip";
import { cn } from "@/lib/utils";
import { GalleryDeleteDialog } from "./delete-dialog";
import {
  formatGalleryCreated,
  formatGalleryDuration,
  galleryItemKind,
  galleryItemSize,
  galleryItemModel,
  galleryItemName,
  galleryItemTitle,
  galleryPromptSummary,
  reviewStatusLabel,
  reviewStatusTone,
  sourceHost,
} from "./format";
import type { GalleryMediaSession } from "./media-session";
import { GalleryReviewStatusControl } from "./review-status-control";
import type { GalleryItem } from "./types";

export function GalleryLightbox({
  item,
  session,
  onClose,
}: {
  item: GalleryItem | null;
  session: GalleryMediaSession;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] max-w-[1040px] gap-0 overflow-y-auto p-0 sm:max-w-[1040px] lg:h-[min(680px,calc(100dvh-2rem))] lg:overflow-hidden"
      >
        {item && <LightboxBody item={item} session={session} />}
      </DialogContent>
    </Dialog>
  );
}

function LightboxBody({ item, session }: { item: GalleryItem; session: GalleryMediaSession }) {
  const { deletingId, copySourceUrl, downloadItem, deleteItem, onReviewStatusChange, onHandoff, onFeedback } =
    session;
  const title = galleryItemTitle(item);
  const duration = formatGalleryDuration(item.durationSec);
  const size = galleryItemSize(item);
  const prompt = galleryPromptSummary(item.prompt, 600);
  const source = item.tiktokSourceUrl;

  return (
    <div className="grid min-h-0 lg:h-full lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-h-[280px] min-w-0 items-center justify-center bg-[#09090B] p-4 lg:p-6">
        <MediaPreviewFrame
          type={item.type}
          src={item.url}
          width={item.width}
          height={item.height}
          alt={galleryItemName(item)}
          variant="detail"
          className="max-h-[42dvh] w-full bg-transparent lg:h-full lg:max-h-full [&>div]:h-[42dvh] [&>div]:max-h-none [&>div]:min-h-0 lg:[&>div]:h-full"
          mediaClassName="object-contain"
        />
      </div>
      <aside className="flex min-h-0 min-w-0 flex-col gap-3.5 px-5 pt-[18px] pb-5 lg:overflow-y-auto">
        <div className="wb-panel-head">
          <DialogTitle className="wb-panel-title">Preview</DialogTitle>
          <DialogClose
            className={iconButtonClass("quiet", 30)}
            aria-label="Close preview"
          >
            <Icon name="x" size={14} />
          </DialogClose>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-[15px] font-bold leading-5 text-fg" title={title}>
              {title}
            </h3>
            <StatusChip tone={reviewStatusTone[item.reviewStatus.value]}>
              {reviewStatusLabel[item.reviewStatus.value]}
            </StatusChip>
          </div>
          <KeyValueList
            rows={[
              { label: "Type", value: galleryItemKind(item) },
              { label: "Model", value: galleryItemModel(item) },
              ...(size ? [{ label: "Size", value: size, mono: true }] : []),
              ...(item.type === "video" && duration
                ? [{ label: "Duration", value: duration, mono: true }]
                : []),
              { label: "Created", value: formatGalleryCreated(item.createdAt), mono: true },
              ...(source
                ? [{ label: "Source", value: <SourceLinks url={source} onCopy={copySourceUrl} /> }]
                : []),
            ]}
          />
        </div>

        {prompt && (
          <p className="line-clamp-5 min-w-0 break-words text-[13px] leading-[18px] text-fg-secondary [overflow-wrap:anywhere]">
            {prompt}
          </p>
        )}

        <GalleryReviewStatusControl
          outputId={item.id}
          reviewStatus={item.reviewStatus}
          onStatusChange={(reviewStatus) => {
            onReviewStatusChange?.(item.id, reviewStatus);
            session.openPreview({ ...item, reviewStatus });
          }}
          onFeedback={onFeedback}
        />

        <div className="mt-auto flex flex-col gap-2 border-t border-hairline pt-4">
          <div className="flex gap-2">
            <Button size={38} className="flex-1" onClick={() => void downloadItem(item)}>
              Download
            </Button>
            <Button size={38} className="flex-1" onClick={() => void onHandoff?.(item)}>
              Handoff
            </Button>
            <GalleryDeleteDialog
              disabled={deletingId === item.id}
              trigger={<button type="button" className={cn(buttonClass("danger", 38), "flex-1")} />}
              title="Delete this asset?"
              description="This permanently removes the generated file and cannot be undone."
              actionLabel="Delete asset"
              onConfirm={() => void deleteItem(item)}
            >
              {deletingId === item.id ? "Deleting" : "Delete"}
            </GalleryDeleteDialog>
          </div>
          {item.type === "image" && (
            <Link
              href={`/ugc-clone?referenceFileId=${encodeURIComponent(item.id)}`}
              className={cn(buttonClass("strong", 40), "w-full text-[13px] leading-4")}
            >
              Use in Clone
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

function SourceLinks({ url, onCopy }: { url: string; onCopy: (url: string) => void }) {
  return (
    <span className="flex items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        title={url}
        className="font-semibold text-fg underline underline-offset-2"
      >
        {sourceHost(url)}
      </a>
      <button
        type="button"
        aria-label="Copy source URL"
        onClick={() => void onCopy(url)}
        className="font-semibold text-fg-secondary underline underline-offset-2 hover:text-fg"
      >
        Copy
      </button>
    </span>
  );
}
