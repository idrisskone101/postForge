"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import type { ClonePreselectedSourceResult } from "@/components/clone/view-models";
import {
  TikTokSavedSources,
  type SavedTikTokSource,
  type SourceListPage,
} from "@/components/tiktok-saved-sources";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";
import { savedSourceMatchesHandoffUrl } from "@/lib/ugc-clone-handoff";
import { Button, Skeleton } from "@/components/workbench";

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
  handoffSourceUrl?: string | null;
  onPreselectedSourceResolved?: (result: ClonePreselectedSourceResult) => void;
}

export function TikTokInput({
  onDownloaded,
  videoInfo,
  refreshKey,
  preselectedSourceId,
  handoffSourceUrl,
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
  const [showSavedSources, setShowSavedSources] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const autoSelectedIdRef = useRef<string | null>(null);
  const autoImportedUrlRef = useRef<string | null>(null);

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

  const importFromUrl = useCallback(async (nextUrl: string) => {
    const trimmed = nextUrl.trim();
    if (!trimmed) return null;

    setIsDownloading(true);
    setError(null);

    try {
      const result = await apiPost<SavedTikTokSource>("/api/ugc-clone/download", {
        url: trimmed,
      });

      setSavedSources((prev) => {
        const exists = prev.some((s) => s.id === result.id);
        return exists ? prev : [result, ...prev];
      });

      onDownloaded(toVideoInfo(result));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      return null;
    } finally {
      setIsDownloading(false);
    }
  }, [onDownloaded]);

  useEffect(() => {
    if (!preselectedSourceId) {
      autoSelectedIdRef.current = null;
    }
    if (!handoffSourceUrl) {
      autoImportedUrlRef.current = null;
    }

    if (preselectedSourceId) {
      if (isLoadingSources || sourcesError) return;
      if (autoSelectedIdRef.current === preselectedSourceId) return;

      const source = savedSources.find((item) => item.id === preselectedSourceId);
      if (!source) {
        if (sourcesNextCursor) return;
        autoSelectedIdRef.current = preselectedSourceId;
        setError("The handed-off saved source is no longer available. Choose another source.");
        onPreselectedSourceResolved?.({
          handoff: "sourceId",
          status: "missing",
          sourceId: preselectedSourceId,
        });
        return;
      }

      autoSelectedIdRef.current = preselectedSourceId;
      onDownloaded(toVideoInfo(source));
      setError(null);
      onPreselectedSourceResolved?.({
        handoff: "sourceId",
        status: "selected",
        sourceId: preselectedSourceId,
      });
      return;
    }

    if (!handoffSourceUrl || isLoadingSources || isDownloading) return;
    if (autoImportedUrlRef.current === handoffSourceUrl) return;

    const existing = savedSources.find((item) =>
      savedSourceMatchesHandoffUrl(item.originalUrl, handoffSourceUrl)
    );
    if (existing) {
      autoImportedUrlRef.current = handoffSourceUrl;
      onDownloaded(toVideoInfo(existing));
      setUrl(handoffSourceUrl);
      setError(null);
      onPreselectedSourceResolved?.({
        handoff: "sourceUrl",
        status: "selected",
        sourceUrl: handoffSourceUrl,
      });
      return;
    }

    autoImportedUrlRef.current = handoffSourceUrl;
    setUrl(handoffSourceUrl);
    void importFromUrl(handoffSourceUrl).then((result) => {
      onPreselectedSourceResolved?.({
        handoff: "sourceUrl",
        status: result ? "selected" : "missing",
        sourceUrl: handoffSourceUrl,
      });
    });
  }, [
    handoffSourceUrl,
    importFromUrl,
    isDownloading,
    isLoadingSources,
    onDownloaded,
    onPreselectedSourceResolved,
    preselectedSourceId,
    savedSources,
    sourcesError,
    sourcesNextCursor,
  ]);

  const handleDownload = () => {
    void importFromUrl(url);
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
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 items-center gap-2 max-sm:flex-col max-sm:items-stretch">
        <input
          type="url"
          aria-label="TikTok video URL"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "tiktok-import-error" : undefined}
          placeholder="Paste TikTok URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isDownloading}
          className="wb-input min-w-0 flex-1"
        />
        <Button
          variant="strong"
          size={40}
          onClick={handleDownload}
          disabled={!url.trim() || isDownloading}
        >
          {isDownloading ? (
            <>
              <span className="wb-live-dot" />
              Importing
            </>
          ) : (
            "Import"
          )}
        </Button>
      </div>

      {error && (
        <p
          id="tiktok-import-error"
          role="alert"
          className="wb-notice wb-fade-in min-w-0 [overflow-wrap:anywhere]"
          data-tone="bad"
        >
          <span className="min-w-0 text-fg">{error}</span>
        </p>
      )}

      {sourcesError && (
        <p role="alert" className="wb-notice min-w-0 [overflow-wrap:anywhere]" data-tone="bad">
          <span className="min-w-0">
            <strong className="font-semibold text-bad">Saved sources did not load.</strong>{" "}
            {sourcesError}
          </span>
        </p>
      )}

      {isLoadingSources ? (
        <div aria-hidden="true" className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} shape="tile" className="aspect-[9/16]" />
          ))}
        </div>
      ) : (
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