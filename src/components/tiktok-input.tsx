"use client";

import { useState, useEffect } from "react";
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
}

export function TikTokInput({ onDownloaded, videoInfo, refreshKey }: TikTokInputProps) {
  const [url, setUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSources, setSavedSources] = useState<SavedSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [showSavedSources, setShowSavedSources] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
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
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="url"
            placeholder="https://www.tiktok.com/@user/video/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isDownloading}
            className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-accent-green/50 focus:bg-card focus:outline-none transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!url.trim() || isDownloading}
          className={cn(
            "rounded-2xl px-5 py-3 text-sm font-semibold transition-all flex items-center gap-2",
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
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="size-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Success preview */}
      {videoInfo && (
        <div className="rounded-2xl border border-accent-green/30 bg-accent-green/5 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-accent-green shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Video downloaded</p>
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

      {/* Saved Sources Section */}
      {!isLoadingSources && savedSources.length > 0 && (
        <div>
          {/* Divider toggle */}
          <button
            type="button"
            onClick={() => setShowSavedSources(!showSavedSources)}
            className="w-full flex items-center gap-3 py-2 group"
          >
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1.5">
              Saved Sources ({savedSources.length})
              <ChevronDown
                className={cn(
                  "size-3 transition-transform",
                  showSavedSources && "rotate-180"
                )}
              />
            </span>
            <div className="flex-1 h-px bg-border" />
          </button>

          {/* Source grid */}
          {showSavedSources && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
              {savedSources.map((source) => {
                const isSelected = videoInfo?.id === source.id;
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => handleSelectSource(source)}
                    className={cn(
                      "group relative rounded-2xl overflow-hidden border-2 transition-all text-left",
                      isSelected
                        ? "border-accent-green shadow-[0_0_0_2px_rgba(123,165,67,0.2)]"
                        : "border-border hover:border-accent-green/50"
                    )}
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
                        <Video className="size-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Duration badge */}
                    <div className="absolute top-1.5 right-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {formatDuration(source.durationSec)}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSource(source.id, e)}
                      disabled={deletingId === source.id}
                      className="absolute top-1.5 left-1.5 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    >
                      {deletingId === source.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                    </button>

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
                        <CheckCircle2 className="size-8 text-accent-green drop-shadow-lg" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
