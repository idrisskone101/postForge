"use client";

import { useState, type ChangeEvent } from "react";
import { Film, ImageIcon, Loader2 } from "lucide-react";
import { Button, Icon, Segmented } from "@/components/workbench";
import { VideoFramePreview } from "@/components/video-frame-preview";
import { cn } from "@/lib/utils";
import type { SwapMode } from "@/lib/ai/types";

export type SwapUploadedAsset = {
  id: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  localPath: string;
  durationSec?: number | null;
  width?: number | null;
  height?: number | null;
};

export type SwapInputValue = {
  video: SwapUploadedAsset | null;
  reference: SwapUploadedAsset | null;
  swapMode: SwapMode;
};

export type SwapInputSectionProps = {
  value: SwapInputValue;
  onChange: (value: SwapInputValue) => void;
  disabled?: boolean;
  /** Kept for callers; the wells reflow on their container width instead. */
  compact?: boolean;
  requireReference?: boolean;
};

type SwapField = "video" | "reference";
type UploadStatus =
  | { kind: "idle" }
  | { kind: "uploading"; field: SwapField }
  | { kind: "error"; field: SwapField; message: string; file: File };

export function SwapInputSection({
  value,
  onChange,
  disabled = false,
  requireReference = false,
}: SwapInputSectionProps) {
  const [status, setStatus] = useState<UploadStatus>({ kind: "idle" });
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const upload = async (field: SwapField, file: File) => {
    setStatus({ kind: "uploading", field });
    try {
      const asset = await uploadAsset(field, file);
      const preview = URL.createObjectURL(file);
      setPreviews((current) => ({ ...current, [asset.id]: preview }));
      onChange(field === "video" ? { ...value, video: asset } : { ...value, reference: asset });
      setStatus({ kind: "idle" });
    } catch (cause) {
      setStatus({
        kind: "error",
        field,
        file,
        message: cause instanceof Error ? cause.message : "Upload failed.",
      });
    }
  };

  const handleFile = (field: SwapField, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void upload(field, file);
  };

  const clear = (field: SwapField) => {
    const asset = value[field];
    const preview = asset ? previews[asset.id] : undefined;
    if (preview) URL.revokeObjectURL(preview);
    onChange(field === "video" ? { ...value, video: null } : { ...value, reference: null });
  };

  const well = (field: SwapField, label: string) => (
    <SwapWell
      field={field}
      label={label}
      asset={value[field]}
      state={{
        disabled,
        uploading: status.kind === "uploading" && status.field === field,
        preview: value[field] ? previews[value[field].id] : undefined,
        onFile: (event) => handleFile(field, event),
        onRemove: () => clear(field),
      }}
    />
  );

  return (
    <div className="@container flex min-w-0 flex-col gap-3">
      <div className="grid min-w-0 gap-3 @min-[560px]:grid-cols-2">
        {well("video", "Source video")}
        {well("reference", requireReference ? "Swap reference" : "Swap reference (optional)")}
      </div>

      {status.kind === "error" ? (
        <div role="alert" className="wb-notice" data-tone="bad">
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <strong>Upload failed.</strong> {status.message}
          </span>
          <Button
            variant="link"
            size={32}
            disabled={disabled}
            onClick={() => void upload(status.field, status.file)}
          >
            Retry
          </Button>
        </div>
      ) : null}

      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-1.5">
        <span className="wb-label" aria-hidden="true">Swap mode</span>
        <Segmented
          label="Swap mode"
          value={value.swapMode}
          onChange={(swapMode) => onChange({ ...value, swapMode })}
          options={SWAP_MODES}
          className="self-start"
        />
      </fieldset>
    </div>
  );
}

const SWAP_MODES: Array<{ value: SwapMode; label: string }> = [
  { value: "person", label: "Person" },
  { value: "object", label: "Object" },
  { value: "background", label: "Background" },
];

type SwapWellState = {
  disabled: boolean;
  uploading: boolean;
  preview: string | undefined;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
};

function SwapWell({
  field,
  label,
  asset,
  state,
}: {
  field: SwapField;
  label: string;
  asset: SwapUploadedAsset | null;
  state: SwapWellState;
}) {
  const kind = field === "video" ? "video" : "image";
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="wb-label">{label}</span>
      {asset ? (
        <div className="flex min-h-24 min-w-0 items-center gap-3 rounded-lg bg-raised p-3">
          <span className="relative grid h-[72px] w-[54px] shrink-0 place-items-center overflow-hidden rounded-[10px] bg-media text-fg-muted [&>:is(img,video)]:absolute [&>:is(img,video)]:inset-0 [&>:is(img,video)]:size-full [&>:is(img,video)]:object-cover">
            {field === "video" ? <Film className="size-4" /> : <ImageIcon className="size-4" />}
            {state.preview && field === "video" ? (
              <VideoFramePreview src={state.preview} label={asset.filename} />
            ) : state.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.preview} alt={asset.filename} />
            ) : null}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <b className="truncate text-[14px] font-semibold leading-[18px] text-fg">{asset.filename}</b>
            <span className="wb-mono text-fg-secondary">{assetMeta(asset)}</span>
          </span>
          <Button
            variant="outline"
            size={32}
            aria-label={`Remove ${label.toLowerCase()}`}
            onClick={state.onRemove}
            disabled={state.disabled}
            className="shrink-0"
          >
            Remove
          </Button>
        </div>
      ) : (
        <label
          className={cn(
            "flex min-h-24 cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-dashed border-edge bg-raised px-3 text-[14px] font-semibold leading-[18px] text-fg transition-colors duration-160 ease-pf hover:bg-raised-strong has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ember",
            (state.disabled || state.uploading) && "cursor-not-allowed text-fg-muted hover:bg-raised"
          )}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-raised-strong text-fg-secondary">
            {state.uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Icon name="upload" size={16} />
            )}
          </span>
          {state.uploading ? "Uploading…" : `Choose ${kind}`}
          <input
            type="file"
            accept={field === "video" ? "video/mp4,video/quicktime,video/webm,video/x-m4v" : "image/*"}
            className="sr-only"
            disabled={state.disabled || state.uploading}
            onChange={state.onFile}
          />
        </label>
      )}
    </div>
  );
}

function assetMeta(asset: SwapUploadedAsset) {
  return [
    asset.durationSec ? formatDuration(asset.durationSec) : null,
    formatBytes(asset.fileSizeBytes),
    asset.width && asset.height ? `${asset.width}×${asset.height}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadAsset(field: SwapField, file: File): Promise<SwapUploadedAsset> {
  const formData = new FormData();
  formData.append(field, file);
  const response = await fetch("/api/swap-assets", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(
      body?.error ?? (field === "video" ? "Video upload failed." : "Reference image upload failed.")
    );
  }
  const data = (await response.json()) as {
    video?: SwapUploadedAsset | null;
    reference?: SwapUploadedAsset | null;
  };
  return (field === "video" ? data.video : data.reference) as SwapUploadedAsset;
}
