"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Film, ImageIcon, Loader2, Upload, X } from "lucide-react";
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
  compact?: boolean;
  requireReference?: boolean;
};

const SWAP_MODES: Array<{ id: SwapMode; label: string }> = [
  { id: "person", label: "Person" },
  { id: "object", label: "Object" },
  { id: "background", label: "Background" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadAsset(
  field: "video" | "reference",
  file: File
): Promise<SwapUploadedAsset> {
  const formData = new FormData();
  formData.append(field, file);
  const response = await fetch("/api/swap-assets", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
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

export function SwapInputSection({
  value,
  onChange,
  disabled = false,
  compact = false,
  requireReference = false,
}: SwapInputSectionProps) {
  const [uploading, setUploading] = useState<"video" | "reference" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (
    field: "video" | "reference",
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(field);
    setError(null);
    try {
      const asset = await uploadAsset(field, file);
      onChange(
        field === "video"
          ? { ...value, video: asset }
          : { ...value, reference: asset }
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading(null);
      if (field === "video" && videoInputRef.current) {
        videoInputRef.current.value = "";
      }
      if (field === "reference" && referenceInputRef.current) {
        referenceInputRef.current.value = "";
      }
    }
  };

  const clear = (field: "video" | "reference") => {
    onChange(
      field === "video"
        ? { ...value, video: null }
        : { ...value, reference: null }
    );
  };

  const fileCard = (
    label: string,
    asset: SwapUploadedAsset | null,
    field: "video" | "reference",
    inputRef: React.RefObject<HTMLInputElement | null>,
    uploadingState: "video" | "reference" | null
  ) => {
    const isUploading = uploading === uploadingState;
    return (
      <div className="min-w-0">
        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.09em] text-[#777873]">
          {label}
        </span>
        {asset ? (
          <div className="flex min-w-0 items-center gap-2 rounded-[9px] border border-[#D7D8D0] bg-[#FCFCFA] px-3 py-2.5">
            {field === "video" ? (
              <Film className="size-3.5 shrink-0 text-[#378EFF]" />
            ) : (
              <ImageIcon className="size-3.5 shrink-0 text-[#22A887]" />
            )}
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[10px] font-semibold text-[#30312E]">
                {asset.filename}
              </b>
              <small className="mt-0.5 block text-[10px] text-[#92938E]">
                {formatBytes(asset.fileSizeBytes)}
                {asset.durationSec ? ` · ${Math.round(asset.durationSec)}s` : ""}
                {asset.width ? ` · ${asset.width}×${asset.height}` : ""}
              </small>
            </span>
            <button
              type="button"
              aria-label={`Clear ${label.toLowerCase()}`}
              onClick={() => clear(field)}
              disabled={disabled}
              className="grid size-6 shrink-0 place-items-center rounded-md text-[#92938E] hover:bg-[#F1F2EC] hover:text-[#C53A32] disabled:opacity-40"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <label
            className={cn(
              "flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-dashed border-[#CFD0C8] bg-[#FAFBF7] px-3 text-[10px] font-semibold text-[#686965] transition-colors hover:border-[#FF4A20] hover:text-[#FF4A20]",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="size-3.5" /> Choose {field === "video" ? "video" : "image"}
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={field === "video" ? "video/mp4,video/quicktime,video/webm,video/x-m4v" : "image/*"}
              className="sr-only"
              disabled={disabled || isUploading}
              onChange={(event) => void handleFile(field, event)}
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-3", compact && "space-y-2.5")}>
      <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
        {fileCard(
          "Source video",
          value.video,
          "video",
          videoInputRef,
          "video"
        )}
        {fileCard(
          requireReference ? "Swap reference" : "Swap reference (optional)",
          value.reference,
          "reference",
          referenceInputRef,
          "reference"
        )}
      </div>

      {requireReference && !value.reference && !value.video && (
        <p className="text-[10px] leading-4 text-[#858681]">
          Upload a video and a reference image of the subject that should replace it.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#777873]">
          Swap mode
        </span>
        {SWAP_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            aria-pressed={value.swapMode === mode.id}
            disabled={disabled}
            onClick={() => onChange({ ...value, swapMode: mode.id })}
            className={cn(
              "h-7 rounded-lg border px-2.5 text-[10px] font-medium transition-colors",
              value.swapMode === mode.id
                ? "border-[#232323] bg-[#F3F4EF] text-[#232323]"
                : "border-[#DCDED6] bg-white text-[#6F706C] hover:border-[#BFC0B9]",
              disabled && "opacity-50"
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="min-w-0 break-words rounded-lg bg-[#FEF0EF] px-3 py-2 text-[10px] leading-4 text-[#C53A32] [overflow-wrap:anywhere]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
