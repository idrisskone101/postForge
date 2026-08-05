"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ImageIcon, Loader2, Play, Video } from "lucide-react";
import { apiGet } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface ReferenceOutput {
  id: string;
  filename: string;
  type: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

interface VideoReferencePickerProps {
  selectedFileId: string | null;
  onChange: (fileId: string | null) => void;
  disabled?: boolean;
  disabledMessage?: string;
  onSeedMissingChange?: (missing: boolean) => void;
}

const REFERENCE_LIMIT = 8;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

interface SelectedSeedFallback {
  id: string;
  kind: "video" | "image";
  filename: string;
  detail: string;
}

export function VideoReferencePicker({
  selectedFileId,
  onChange,
  disabled = false,
  disabledMessage,
  onSeedMissingChange,
}: VideoReferencePickerProps) {
  const [videos, setVideos] = useState<ReferenceOutput[]>([]);
  const [images, setImages] = useState<ReferenceOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedFallback, setSeedFallback] = useState<SelectedSeedFallback | null>(
    null
  );
  const [seedMissing, setSeedMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [videoFiles, imageFiles] = await Promise.all([
          apiGet<ReferenceOutput[]>("/api/files?type=video&limit=8"),
          apiGet<ReferenceOutput[]>("/api/files?type=image&limit=8"),
        ]);
        if (cancelled) return;
        setVideos(videoFiles);
        setImages(imageFiles);
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Recent outputs could not be loaded."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const outputs = useMemo(() => {
    const merged = [
      ...videos.map((file) => ({ ...file, kind: "video" as const })),
      ...images.map((file) => ({ ...file, kind: "image" as const })),
    ];
    return merged
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, REFERENCE_LIMIT);
  }, [videos, images]);

  useEffect(() => {
    if (!selectedFileId) {
      setSeedFallback(null);
      setSeedMissing(false);
      onSeedMissingChange?.(false);
      return;
    }
    if (outputs.some((file) => file.id === selectedFileId)) {
      setSeedFallback(null);
      setSeedMissing(false);
      onSeedMissingChange?.(false);
      return;
    }

    let active = true;
    const loadSeed = async () => {
      try {
        const data = await apiGet<{
          file: {
            id: string;
            filename: string;
            type: string;
            width: number | null;
            height: number | null;
          };
        }>(`/api/files/${encodeURIComponent(selectedFileId)}/metadata`);
        if (!active) return;
        const file = data.file;
        const kind: "video" | "image" =
          file.type === "video" ? "video" : "image";
        setSeedFallback({
          id: file.id,
          kind,
          filename: file.filename,
          detail:
            file.width && file.height
              ? `${file.width} × ${file.height}`
              : kind === "video"
                ? "Video output"
                : "Image output",
        });
        setSeedMissing(false);
        onSeedMissingChange?.(false);
      } catch {
        if (!active) return;
        setSeedFallback(null);
        setSeedMissing(true);
        onSeedMissingChange?.(true);
      }
    };
    void loadSeed();
    return () => {
      active = false;
    };
  }, [selectedFileId, outputs, onSeedMissingChange]);

  const selected =
    outputs.find((file) => file.id === selectedFileId) ?? null;
  const selectedFilename =
    asString(selected?.filename) ??
    asString(seedFallback?.filename) ??
    "Selected output";
  const selectedKind = selected?.kind ?? seedFallback?.kind ?? "video";
  const selectedDetail = seedFallback?.detail;

  if (loading) {
    return (
      <div className="flex min-h-24 items-center justify-center gap-2 rounded-lg border border-[#E1E2DC] bg-[#FAFBF7] text-[#858681]">
        <Loader2 className="size-3.5 animate-spin" />
        <span className="text-[10px]">Loading recent outputs…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="min-w-0 break-words rounded-lg bg-[#FEF0EF] px-3 py-2 text-[10px] text-[#C53A32] [overflow-wrap:anywhere]"
      >
        {error}
      </p>
    );
  }

  if (seedMissing) {
    return (
      <div role="alert" className="space-y-3">
        <div className="flex min-w-0 items-start gap-2 rounded-lg bg-[#FEF0EF] px-3 py-2 text-[10px] leading-4 text-[#C53A32]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            This output is no longer available. Clear the seed to continue.
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-[10px] font-semibold text-[#C53A32] hover:underline"
          >
            Clear
          </button>
        </div>
        {outputs.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {outputs.map((file) => (
              <button
                type="button"
                key={file.id}
                disabled={disabled}
                aria-label={`Use ${file.filename}`}
                onClick={() => onChange(file.id)}
                className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-lg border-2 border-transparent bg-[#ECEDE7] transition hover:border-[#C7C8C0]"
              >
                {file.kind === "video" ? (
                  <video
                    src={`/api/files/${file.id}`}
                    preload="metadata"
                    muted
                    playsInline
                    aria-label={file.filename}
                    className="size-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/files/${file.id}`}
                    alt={file.filename}
                    className="size-full object-cover"
                  />
                )}
                {file.kind === "video" && (
                  <span className="absolute inset-0 grid place-items-center bg-black/25">
                    <Play className="size-4 text-white drop-shadow" />
                  </span>
                )}
                <span className="absolute bottom-1 left-1 rounded-[4px] bg-[#232323]/75 px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-white">
                  {file.kind}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (outputs.length === 0 && !seedFallback) {
    return (
      <a
        href="/gallery"
        className="flex min-h-24 items-center justify-center gap-2 rounded-lg border border-dashed border-[#CFD0C8] bg-[#FAFBF7] px-3 text-center text-[10px] font-semibold text-[#686965]"
      >
        <Video className="size-4 shrink-0" /> Generate a video first, then continue
        it here
      </a>
    );
  }

  return (
    <div className={cn("space-y-3", disabled && "opacity-60")}>
      <p className="text-[10px] leading-4 text-[#858681]">
        Pick one recent output. The first frame of a video becomes the seed for
        the next one.
      </p>

      {disabledMessage && disabled ? (
        <p className="rounded-lg bg-[#F1F2EC] px-3 py-2 text-[10px] leading-4 text-[#777873]">
          {disabledMessage}
        </p>
      ) : selected || seedFallback ? (
        <div className="flex min-w-0 items-center gap-2.5 rounded-[9px] border border-[#D7D8D0] bg-[#FCFCFA] px-3 py-2.5">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-[8px]",
              selectedKind === "video"
                ? "bg-[#EEF5FF] text-[#378EFF]"
                : "bg-[#E9F7EC] text-[#22A887]"
            )}
          >
            {selectedKind === "video" ? (
              <Play className="size-3.5" />
            ) : (
              <ImageIcon className="size-3.5" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-[10px] font-semibold text-[#30312E]">
              {selectedFilename}
            </strong>
            <small className="mt-0.5 block truncate text-[9px] uppercase tracking-[0.08em] text-[#898A85]">
              {selectedKind === "video" ? "Video seed" : "Image seed"}
              {selectedDetail ? ` · ${selectedDetail}` : ""}
            </small>
          </span>
          {!selected && (
            <span className="shrink-0 rounded-full bg-[#F1F2EC] px-2 py-1 text-[9px] font-semibold text-[#777873]">
              Linked
            </span>
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-[10px] font-semibold text-[#378EFF] hover:underline"
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-2">
        {outputs.map((file) => {
          const isSelected = selectedFileId === file.id;
          return (
            <button
              type="button"
              key={file.id}
              disabled={disabled}
              aria-label={`${isSelected ? "Remove" : "Use"} ${file.filename}`}
              aria-pressed={isSelected}
              onClick={() => onChange(isSelected ? null : file.id)}
              className={cn(
                "relative aspect-[4/5] min-w-0 overflow-hidden rounded-lg border-2 bg-[#ECEDE7] transition",
                isSelected
                  ? "border-[#FF4A20]"
                  : "border-transparent hover:border-[#C7C8C0]"
              )}
            >
              {file.kind === "video" ? (
                <video
                  src={`/api/files/${file.id}`}
                  preload="metadata"
                  muted
                  playsInline
                  aria-label={file.filename}
                  className="size-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/files/${file.id}`}
                  alt={file.filename}
                  className="size-full object-cover"
                />
              )}
              {file.kind === "video" && (
                <span className="absolute inset-0 grid place-items-center bg-black/25">
                  <Play className="size-4 text-white drop-shadow" />
                </span>
              )}
              <span className="absolute bottom-1 left-1 rounded-[4px] bg-[#232323]/75 px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-white">
                {file.kind}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
