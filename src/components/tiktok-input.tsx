"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Scissors,
  Trash2,
  Video,
} from "lucide-react";

import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export interface TikTokVideoInfo {
  id?: string;
  localPath: string;
  filename: string;
  durationSec: number;
  width: number;
  height: number;
}

interface SavedSource {
  id: string;
  label: string;
  originalUrl: string;
  localPath: string;
  filename: string;
  durationSec: number;
  width: number;
  height: number;
  fileSizeBytes: number | null;
  thumbnailPath: string | null;
  createdAt: string;
}

interface TikTokInputProps {
  onDownloaded: (info: TikTokVideoInfo | null) => void;
  videoInfo: TikTokVideoInfo | null;
  refreshKey?: number;
  onTrimRequest?: () => void;
  isTrimActive?: boolean;
}

export function TikTokInput({
  onDownloaded,
  videoInfo,
  refreshKey,
  onTrimRequest,
  isTrimActive = false,
}: TikTokInputProps) {
  const [url, setUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSources, setSavedSources] = useState<SavedSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingSources(true);
    apiGet<SavedSource[]>("/api/ugc-clone/sources")
      .then(setSavedSources)
      .catch((err) => console.error("Failed to load saved sources:", err))
      .finally(() => setIsLoadingSources(false));
  }, [refreshKey]);

  const handleDownload = async () => {
    if (!url.trim()) return;

    setIsDownloading(true);
    setError(null);

    try {
      const result = await apiPost<SavedSource>("/api/ugc-clone/download", { url: url.trim() });

      setSavedSources((prev) => {
        const exists = prev.some((source) => source.id === result.id);
        return exists ? prev : [result, ...prev];
      });

      onDownloaded({
        id: result.id,
        localPath: result.localPath,
        filename: result.filename,
        durationSec: result.durationSec,
        width: result.width,
        height: result.height,
      });
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectSource = (source: SavedSource) => {
    setError(null);
    onDownloaded({
      id: source.id,
      localPath: source.localPath,
      filename: source.filename,
      durationSec: source.durationSec,
      width: source.width,
      height: source.height,
    });
  };

  const handleDeleteSource = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeletingId(id);

    try {
      await apiDelete(`/api/ugc-clone/sources/${id}`);
      setSavedSources((prev) => prev.filter((source) => source.id !== id));
      if (videoInfo?.id === id) {
        onDownloaded(null);
      }
    } catch (err) {
      console.error("Failed to delete source:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return minutes > 0 ? `${minutes}:${remainder.toString().padStart(2, "0")}` : `${remainder}s`;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="url"
            placeholder="https://www.tiktok.com/@user/video/..."
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={isDownloading}
            className="w-full rounded-[22px] border border-border bg-muted/60 px-4 py-3 text-sm placeholder:text-muted-foreground transition-all focus:border-accent-green/40 focus:bg-card focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!url.trim() || isDownloading}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[22px] px-5 py-3 text-sm font-semibold transition-all sm:min-w-[148px]",
            isDownloading
              ? "bg-muted text-muted-foreground"
              : "bg-accent-green text-white shadow-[0_8px_24px_rgba(123,165,67,0.24)] hover:brightness-110"
          )}
        >
          {isDownloading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="size-4" />
              Download
            </>
          )}
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-[20px] border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="size-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : null}

      {videoInfo ? (
        <div className="rounded-[22px] border border-accent-green/25 bg-accent-green/5 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-green/10 text-accent-green">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Source ready</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDuration(videoInfo.durationSec)}
                  </span>
                  <span>
                    {videoInfo.width}x{videoInfo.height}
                  </span>
                </div>
              </div>
            </div>

            {onTrimRequest ? (
              <button
                type="button"
                onClick={onTrimRequest}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-colors",
                  isTrimActive
                    ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Scissors className="size-3.5" />
                {isTrimActive ? "Trimmer Open" : "Trim Inline"}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-border/80 bg-background/20 px-4 py-4 text-sm text-muted-foreground">
          Download a TikTok or reuse one of your recent sources to start the workspace.
        </div>
      )}

      {!isLoadingSources && savedSources.length > 0 ? (
        <div className="rounded-[24px] border border-border/70 bg-background/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Recent Sources
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Swap the stage instantly without leaving this tab.
              </p>
            </div>
            <span className="rounded-full border border-border/70 bg-background/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {savedSources.length}
            </span>
          </div>

          <div className="mt-3 grid max-h-[168px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {savedSources.map((source) => {
              const isSelected = videoInfo?.id === source.id;

              return (
                <div
                  key={source.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectSource(source)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelectSource(source);
                    }
                  }}
                  className={cn(
                    "group relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-[20px] border p-2.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-accent-green/30",
                    isSelected
                      ? "border-accent-green/40 bg-accent-green/5"
                      : "border-border/70 bg-background/30 hover:border-accent-green/25 hover:bg-background/50"
                  )}
                >
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-[16px] border border-border/60 bg-muted">
                    {source.thumbnailPath ? (
                      <img
                        src={`/api/ugc-clone/sources/${source.id}/thumbnail`}
                        alt={source.label}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Video className="size-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white">
                      {formatDuration(source.durationSec)}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 pr-8">
                    <p className="truncate text-xs font-semibold text-foreground">{source.label}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{formatSize(source.fileSizeBytes) ?? "Saved source"}</span>
                      <span>
                        {source.width}x{source.height}
                      </span>
                    </div>
                    {isSelected ? (
                      <div className="mt-2 inline-flex rounded-full border border-accent-green/30 bg-accent-green/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-green">
                        Selected
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={(event) => handleDeleteSource(source.id, event)}
                    disabled={deletingId === source.id}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive"
                  >
                    {deletingId === source.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
