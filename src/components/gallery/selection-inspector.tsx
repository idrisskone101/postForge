"use client";

import { useState } from "react";
import Link from "next/link";
import { MediaPreviewFrame } from "@/components/media-preview";
import { Button, buttonClass } from "@/components/workbench/button";
import { Icon } from "@/components/workbench/icon";
import { IconButton } from "@/components/workbench/icon-button";
import { KeyValueList } from "@/components/workbench/key-value-list";
import { Segmented } from "@/components/workbench/segmented";
import { StatusChip } from "@/components/workbench/status-chip";
import { cn } from "@/lib/utils";
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
import { GalleryJobLink } from "./job-link";
import type { GalleryItem } from "./types";

export type GallerySelection = {
  item: GalleryItem;
  position: { index: number; total: number };
  onStep: (direction: -1 | 1) => void;
  onOpenPreview: () => void;
  onDownload: (item: GalleryItem) => Promise<void> | void;
  onCopySource: (url: string) => void;
  onHandoff?: (item: GalleryItem) => Promise<boolean>;
};

export function GallerySelectionInspector({
  selection,
}: {
  selection: GallerySelection;
}) {
  const { item, position, onStep, onOpenPreview, onDownload, onCopySource, onHandoff } =
    selection;
  const [pane, setPane] = useState<"output" | "source">("output");
  const [isDownloading, setIsDownloading] = useState(false);
  const title = galleryItemTitle(item);
  const source = item.tiktokSourceUrl;
  const showSource = pane === "source" && source;
  const duration = formatGalleryDuration(item.durationSec);
  const prompt = galleryPromptSummary(item.prompt, 400);

  const download = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await onDownload(item);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div data-gallery-selection-inspector className="flex min-w-0 flex-col gap-3.5">
      <div className="wb-panel-head">
        <h2 className="wb-panel-title">Selection</h2>
        {position.total > 1 && (
          <div className="flex items-center gap-1.5">
            <IconButton
              icon="chevron-left"
              label="Previous selected output"
              size={30}
              className="text-fg-secondary"
              onClick={() => onStep(-1)}
            />
            <span className="wb-mono px-1 text-fg-secondary">
              {position.index + 1} / {position.total}
            </span>
            <IconButton
              icon="chevron-right"
              label="Next selected output"
              size={30}
              className="text-fg-secondary"
              onClick={() => onStep(1)}
            />
          </div>
        )}
      </div>

      {source && (
        <Segmented
          label="Inspector view"
          value={pane}
          onChange={setPane}
          options={paneOptions}
          className="wb-segmented-block"
        />
      )}

      <div className="wb-well flex h-[312px] shrink-0 items-center justify-center p-4">
        {showSource ? (
          <div className="flex min-w-0 flex-col items-center gap-3 text-center">
            <span className="wb-empty-icon">
              <Icon name="link" size={20} />
            </span>
            <span className="text-sm font-semibold text-fg">{sourceHost(source)}</span>
            <span className="wb-mono line-clamp-2 max-w-full break-all text-fg-muted">
              {source}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenPreview}
            aria-label={`Open preview of ${galleryItemName(item)}`}
            className="relative block max-h-full max-w-full cursor-zoom-in overflow-hidden rounded-lg"
          >
            <MediaPreviewFrame
              type={item.type}
              src={item.url}
              width={item.width}
              height={item.height}
              alt=""
              cover
              variant="card"
              className={cn(
                "h-[280px] max-w-full rounded-lg bg-media",
                !(item.width && item.height) && "w-[158px]"
              )}
              mediaClassName="rounded-lg object-cover"
              thumbnail={{ sizes: "360px" }}
            />
            {duration && <span className="wb-tile-duration">{duration}</span>}
          </button>
        )}
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
        <KeyValueList rows={inspectorRows(item)} />
      </div>

      {prompt && (
        <div className="min-w-0 rounded-lg bg-raised px-3 py-2.5">
          <p className="line-clamp-4 min-w-0 break-words text-[13px] leading-[18px] text-fg-secondary [overflow-wrap:anywhere]">
            {prompt}
          </p>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <div className="flex gap-2">
          {showSource ? (
            <>
              <Button size={38} className="flex-1" onClick={() => onCopySource(source)}>
                Copy
              </Button>
              <a
                href={source}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonClass("quiet", 38), "flex-1")}
              >
                Open
              </a>
            </>
          ) : (
            <>
              <Button size={38} className="flex-1" onClick={onOpenPreview}>
                Preview
              </Button>
              <Button
                size={38}
                className="flex-1"
                disabled={isDownloading}
                onClick={() => void download()}
              >
                Download
              </Button>
            </>
          )}
          <Button size={38} className="flex-1" onClick={() => void onHandoff?.(item)}>
            Handoff
          </Button>
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
    </div>
  );
}

function inspectorRows(item: GalleryItem) {
  const size = galleryItemSize(item);
  const duration = formatGalleryDuration(item.durationSec);
  return [
    { label: "Type", value: galleryItemKind(item) },
    { label: "Model", value: galleryItemModel(item) },
    ...(size ? [{ label: "Size", value: size, mono: true }] : []),
    ...(item.type === "video" && duration ? [{ label: "Duration", value: duration, mono: true }] : []),
    { label: "Created", value: formatGalleryCreated(item.createdAt), mono: true },
    { label: "Job", value: <GalleryJobLink item={item} />, mono: true },
  ];
}

const paneOptions = [
  { value: "output", label: "Output" },
  { value: "source", label: "Source" },
] as const;
