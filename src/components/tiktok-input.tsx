"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Loader2, Download, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

export interface TikTokVideoInfo {
  localPath: string;
  filename: string;
  durationSec: number;
  width: number;
  height: number;
}

interface TikTokInputProps {
  onDownloaded: (info: TikTokVideoInfo) => void;
  videoInfo: TikTokVideoInfo | null;
}

export function TikTokInput({ onDownloaded, videoInfo }: TikTokInputProps) {
  const [url, setUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!url.trim()) return;

    setIsDownloading(true);
    setError(null);

    try {
      const result = await apiPost<TikTokVideoInfo>("/api/ugc-clone/download", {
        url: url.trim(),
      });
      onDownloaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
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
                  {videoInfo.durationSec}s
                </span>
                <span>
                  {videoInfo.width}x{videoInfo.height}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
