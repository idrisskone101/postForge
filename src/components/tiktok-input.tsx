"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Download,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  TikTokSavedSources,
  type SavedTikTokSource,
  type SourceListPage,
} from "@/components/tiktok-saved-sources";

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

interface TikTokInputProps {
  onDownloaded: (info: TikTokVideoInfo | null) => void;
  videoInfo: TikTokVideoInfo | null;
  refreshKey?: number;
  preselectedSourceId?: string | null;
  onPreselectedSourceResolved?: (result: {
    status: "selected" | "missing";
    sourceId: string;
  }) => void;
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
  const [savedSources, setSavedSources] = useState<SavedTikTokSource[]>([]);
  const [sourcesNextCursor, setSourcesNextCursor] = useState<string | null>(null);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isLoadingMoreSources, setIsLoadingMoreSources] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [showSavedSources, setShowSavedSources] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const autoSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoadingSources(true);
    setSourcesError(null);

    apiGet<SourceListPage>("/api/ugc-clone/sources")
      .then((page) => {
        if (!isActive) return;
        setSavedSources(page.items);
        setSourcesNextCursor(page.nextCursor);
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

  const loadMoreSources = async () => {
    if (!sourcesNextCursor || isLoadingMoreSources) return;
    setIsLoadingMoreSources(true);
    setSourcesError(null);
    try {
      const page = await apiGet<SourceListPage>(
        `/api/ugc-clone/sources?cursor=${encodeURIComponent(sourcesNextCursor)}`
      );
      setSavedSources((current) => {
        const seen = new Set(current.map((source) => source.id));
        return [...current, ...page.items.filter((source) => !seen.has(source.id))];
      });
      setSourcesNextCursor(page.nextCursor);
    } catch (err) {
      console.error("Failed to load saved sources:", err);
      setSourcesError(
        err instanceof Error ? err.message : "Failed to load saved sources"
      );
    } finally {
      setIsLoadingMoreSources(false);
    }
  };

  useEffect(() => {
    if (!preselectedSourceId) {
      autoSelectedIdRef.current = null;
      return;
    }
    if (isLoadingSources || sourcesError) return;
    if (autoSelectedIdRef.current === preselectedSourceId) return;

    const source = savedSources.find((item) => item.id === preselectedSourceId);
    if (!source) {
      if (sourcesNextCursor) return;
      autoSelectedIdRef.current = preselectedSourceId;
      setError("The handed-off saved source is no longer available. Choose another source.");
      onPreselectedSourceResolved?.({
        status: "missing",
        sourceId: preselectedSourceId,
      });
      return;
    }

    autoSelectedIdRef.current = preselectedSourceId;
    onDownloaded(toVideoInfo(source));
    setError(null);
    onPreselectedSourceResolved?.({
      status: "selected",
      sourceId: preselectedSourceId,
    });
  }, [
    isLoadingSources,
    onDownloaded,
    onPreselectedSourceResolved,
    preselectedSourceId,
    savedSources,
    sourcesError,
    sourcesNextCursor,
  ]);

  const handleDownload = async () => {
    if (!url.trim()) return;

    setIsDownloading(true);
    setError(null);

    try {
      const result = await apiPost<SavedTikTokSource>("/api/ugc-clone/download", {
        url: url.trim(),
      });

      setSavedSources((prev) => {
        const exists = prev.some((s) => s.id === result.id);
        return exists ? prev : [result, ...prev];
      });

      onDownloaded(toVideoInfo(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteSource = async (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await apiDelete(`/api/ugc-clone/sources/${id}`);
      setSavedSources((prev) => prev.filter((s) => s.id !== id));
      if (videoInfo?.id === id) {
        onDownloaded(null);
      }
    } catch (err) {
      console.error("Failed to delete source:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex-1 relative">
          <input
            type="url"
            aria-label="TikTok video URL"
            placeholder="https://www.tiktok.com/@user/video/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isDownloading}
            className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm placeholder:text-muted-foreground transition-all focus:border-accent-coral/50 focus:bg-card focus:outline-none focus:ring-3 focus:ring-accent-coral/10"
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
              : "bg-accent-coral text-white hover:brightness-[0.93]"
          )}
        >
          {isDownloading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Download className="size-4" />
              Import
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex min-w-0 items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertCircle className="size-4 text-destructive shrink-0" />
          <p className="min-w-0 flex-1 break-words text-xs text-destructive [overflow-wrap:anywhere]">{error}</p>
        </div>
      )}

      {videoInfo && (
        <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 text-accent-green shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{videoInfo.label || "Source ready"}</p>
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
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertCircle className="size-4 shrink-0 text-destructive" />
          <p className="min-w-0 flex-1 break-words text-xs text-destructive [overflow-wrap:anywhere]">{sourcesError}</p>
        </div>
      )}

      {!isLoadingSources && (
        <TikTokSavedSources
          savedSources={savedSources}
          selectedSourceId={videoInfo?.id}
          showSavedSources={showSavedSources}
          sourcesNextCursor={sourcesNextCursor}
          isLoadingMoreSources={isLoadingMoreSources}
          deletingId={deletingId}
          onToggle={() => setShowSavedSources(!showSavedSources)}
          onSelect={(source) => onDownloaded(toVideoInfo(source))}
          onDelete={handleDeleteSource}
          onLoadMore={() => void loadMoreSources()}
        />
      )}
    </div>
  );
}


function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

function toVideoInfo(source: SavedTikTokSource): TikTokVideoInfo {
  return {
    id: source.id,
    label: source.label,
    originalUrl: source.originalUrl,
    localPath: source.localPath,
    filename: source.filename,
    durationSec: source.durationSec,
    width: source.width,
    height: source.height,
  };
}