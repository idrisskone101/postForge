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
      <div className="flex min-h-24 items-center justify-center gap-2 rounded-lg border border-border bg-[var(--pf-active)] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        <span className="text-[12px]">Loading recent outputs…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="min-w-0 break-words rounded-lg bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)] [overflow-wrap:anywhere]"
      >
        {error}
      </p>
    );
  }

  if (seedMissing) {
    return (
      <div role="alert" className="space-y-3">
        <div className="flex min-w-0 items-start gap-2 rounded-lg bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] leading-4 text-[var(--pf-danger)]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            This output is no longer available. Clear the seed to continue.
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-[12px] font-semibold text-[var(--pf-danger)] hover:underline"
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
                className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-lg border-2 border-transparent bg-[var(--pf-active)] transition hover:border-[var(--pf-border-strong)]"
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
                <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-1 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
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
        className="flex min-h-24 items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--pf-border)] bg-[var(--pf-active)] px-3 text-center text-[12px] font-semibold text-muted-foreground"
      >
        <Video className="size-4 shrink-0" /> Generate a video first, then continue
        it here
      </a>
    );
  }

  return (
    <div className={cn("space-y-3", disabled && "opacity-60")}>
      <p className="text-[12px] leading-4 text-muted-foreground">
        Pick one recent output. The first frame of a video becomes the seed for
        the next one.
      </p>

      {disabledMessage && disabled ? (
        <p className="rounded-lg bg-[var(--pf-active)] px-3 py-2 text-[12px] leading-4 text-muted-foreground">
          {disabledMessage}
        </p>
      ) : selected || seedFallback ? (
        <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-[8px]",
              selectedKind === "video"
                ? "bg-[var(--pf-link)]/10 text-[var(--pf-link)]"
                : "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
            )}
          >
            {selectedKind === "video" ? (
              <Play className="size-3.5" />
            ) : (
              <ImageIcon className="size-3.5" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-[12px] font-semibold text-foreground">
              {selectedFilename}
            </strong>
            <small className="mt-0.5 block truncate text-[11px] uppercase tracking-[0.08em] text-[var(--pf-muted)]">
              {selectedKind === "video" ? "Video seed" : "Image seed"}
              {selectedDetail ? ` · ${selectedDetail}` : ""}
            </small>
          </span>
          {!selected && (
            <span className="shrink-0 rounded-full bg-[var(--pf-active)] px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              Linked
            </span>
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-[12px] font-semibold text-[var(--pf-link)] hover:underline"
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
                "relative aspect-[4/5] min-w-0 overflow-hidden rounded-lg border-2 bg-[var(--pf-active)] transition",
                isSelected
                  ? "border-[var(--pf-orange)]"
                  : "border-transparent hover:border-[var(--pf-border-strong)]"
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
              <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-1 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                {file.kind}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
