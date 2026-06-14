"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Download,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Trash2,
  Video,
} from "lucide-react";

export interface TikTokVideoInfo {
  id: string;
  label: string;
  originalUrl: string;
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
  preselectedSourceId?: string | null;
  onPreselectedSourceResolved?: () => void;
}

export function TikTokInput({
  onDownloaded,
  videoInfo,
  refreshKey,
  preselectedSourceId,
  onPreselectedSourceResolved,
}: TikTokInputProps) {
  const [url, setUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSources, setSavedSources] = useState<SavedSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [showSavedSources, setShowSavedSources] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const autoSelectedIdRef = useRef<string | null>(null);
  const hasAutoOpenedSavedSourcesRef = useRef(false);
  const videoInfoRef = useRef<TikTokVideoInfo | null>(videoInfo);

  useEffect(() => {
    videoInfoRef.current = videoInfo;
  }, [videoInfo]);

  useEffect(() => {
    let isActive = true;
    setIsLoadingSources(true);
    setSourcesError(null);

    apiGet<SavedSource[]>("/api/ugc-clone/sources")
      .then((sources) => {
        if (!isActive) return;
        setSavedSources(sources);
        if (
          sources.length > 0 &&
          !videoInfoRef.current &&
          !hasAutoOpenedSavedSourcesRef.current
        ) {
          setShowSavedSources(true);
          hasAutoOpenedSavedSourcesRef.current = true;
        }
      })
      .catch((err) => {
        if (!isActive) return;
        console.error("Failed to load saved sources:", err);
        setSourcesError(
          err instanceof Error ? err.message : "Failed to load saved sources"
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingSources(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!preselectedSourceId || isLoadingSources) return;
    if (autoSelectedIdRef.current === preselectedSourceId) return;

    const source = savedSources.find((item) => item.id === preselectedSourceId);
    if (!source) return;

    autoSelectedIdRef.current = preselectedSourceId;
    onDownloaded({
      id: source.id,
      label: source.label,
      originalUrl: source.originalUrl,
      localPath: source.localPath,
      filename: source.filename,
      durationSec: source.durationSec,
      width: source.width,
      height: source.height,
    });
    onPreselectedSourceResolved?.();
  }, [
    isLoadingSources,
    onDownloaded,
    onPreselectedSourceResolved,
    preselectedSourceId,
    savedSources,
  ]);

  useEffect(() => {
    if (!preselectedSourceId) {
      autoSelectedIdRef.current = null;
    }
  }, [preselectedSourceId]);

  const handleDownload = async () => {
    if (!url.trim()) return;

    setIsDownloading(true);
    setError(null);

    try {
      const result = await apiPost<SavedSource>("/api/ugc-clone/download", {
        url: url.trim(),
      });

      // Add to saved sources if new
      setSavedSources((prev) => {
        const exists = prev.some((s) => s.id === result.id);
        return exists ? prev : [result, ...prev];
      });

      onDownloaded({
        id: result.id,
        label: result.label,
        originalUrl: result.originalUrl,
        localPath: result.localPath,
        filename: result.filename,
        durationSec: result.durationSec,
        width: result.width,
        height: result.height,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectSource = (source: SavedSource) => {
    onDownloaded({
      id: source.id,
      label: source.label,
      originalUrl: source.originalUrl,
      localPath: source.localPath,
      filename: source.filename,
      durationSec: source.durationSec,
      width: source.width,
      height: source.height,
    });
  };

  const handleDeleteSource = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await apiDelete(`/api/ugc-clone/sources/${id}`);
      setSavedSources((prev) => prev.filter((s) => s.id !== id));
      // If the deleted source was selected, clear it
      if (videoInfo?.id === id) {
        onDownloaded(null);
      }
    } catch (err) {
      console.error("Failed to delete source:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex-1 relative">
          <input
            type="url"
            placeholder="https://www.tiktok.com/@user/video/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isDownloading}
            className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm placeholder:text-muted-foreground transition-all focus:border-accent-green/50 focus:bg-card focus:outline-none focus:ring-3 focus:ring-accent-green/10"
          />
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!url.trim() || isDownloading}
          className={cn(
            "flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all",
            isDownloading
              ? "bg-muted text-muted-foreground"
              : "bg-accent-green text-white shadow-[0_4px_16px_rgba(123,165,67,0.25)] hover:shadow-[0_4px_24px_rgba(123,165,67,0.35)] hover:brightness-110"
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertCircle className="size-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Success preview */}
      {videoInfo && (
        <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 text-accent-green shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{videoInfo.label || "Video loaded"}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDuration(videoInfo.durationSec)}
                </span>
                <span>
                  {videoInfo.width}x{videoInfo.height}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoadingSources && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading saved sources...
        </div>
      )}

      {sourcesError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertCircle className="size-4 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">{sourcesError}</p>
        </div>
      )}

      {/* Saved Sources Section */}
      {!isLoadingSources && savedSources.length > 0 && (
        <div>
          {/* Divider toggle */}
          <button
            type="button"
            onClick={() => setShowSavedSources(!showSavedSources)}
            className="group flex w-full items-center gap-3 rounded-lg border border-border bg-muted/25 px-3 py-2 transition-colors hover:bg-muted/45"
          >
            <Video className="size-3.5 text-muted-foreground" />
            <span className="flex flex-1 items-center gap-1.5 text-left text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              Saved Sources ({savedSources.length})
              <ChevronDown
                className={cn(
                  "size-3 transition-transform",
                  showSavedSources && "rotate-180"
                )}
              />
            </span>
          </button>

          {/* Source grid */}
          {showSavedSources && (
            <div
              data-saved-source-grid="true"
              className="mt-2 grid max-h-[360px] grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 overflow-y-auto pr-1"
            >
              {savedSources.map((source) => {
                const isSelected = videoInfo?.id === source.id;
                return (
                  <div
                    key={source.id}
                    className={cn(
                      "group relative overflow-hidden rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-accent-green shadow-[0_0_0_2px_rgba(123,165,67,0.2)]"
                        : "border-border hover:border-accent-green/50"
                    )}
                  >
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleSelectSource(source)}
                      className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-accent-green/40 focus:ring-offset-2 focus:ring-offset-background"
                    >
                      {/* Thumbnail */}
                      <div className="aspect-[9/16] bg-muted flex items-center justify-center">
                        {source.thumbnailPath ? (
                          <img
                            src={`/api/ugc-clone/sources/${source.id}/thumbnail`}
                            alt={source.label}
                            className="size-full object-cover"
                          />
                        ) : (
                          <Video className="size-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Duration badge */}
                      <div className="absolute top-1.5 right-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {formatDuration(source.durationSec)}
                      </div>

                      {/* Label + metadata */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                        <p className="text-[10px] font-medium text-white truncate">
                          {source.label}
                        </p>
                        {source.fileSizeBytes && (
                          <p className="text-[9px] text-white/60">
                            {formatSize(source.fileSizeBytes)}
                          </p>
                        )}
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-accent-green/10 flex items-center justify-center">
                          <CheckCircle2 className="size-6 text-accent-green drop-shadow-lg" />
                        </div>
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSource(source.id, e)}
                      disabled={deletingId === source.id}
                      className="absolute top-1.5 left-1.5 z-10 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/80"
                      aria-label={`Delete ${source.label}`}
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
          )}
        </div>
      )}
    </div>
  );
}
