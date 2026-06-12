"use client";

import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiPost } from "@/lib/api/client";
import type {
  InspirationVideoCard,
  TrackedInspirationAccount,
  UseInspirationResult,
} from "@/lib/inspiration/types";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowUpRight,
  CheckCircle2,
  Compass,
  Copy,
  ExternalLink,
  Heart,
  Loader2,
  MessageCircle,
  Play,
  RefreshCw,
  Repeat2,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";

interface InspirationPageClientProps {
  initialAccounts: TrackedInspirationAccount[];
}

function formatMetric(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

function formatDuration(durationSec: number | null): string {
  if (!durationSec || durationSec <= 0) return "TikTok";
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.round(durationSec % 60);
  return minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, "0")}`
    : `${seconds}s`;
}

function formatPublishedDate(value: string | null): string {
  if (!value) return "Unknown publish date";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInspirationThumbnailSrc(videoId: string, updatedAt: string): string {
  return `/api/ugc-inspiration/videos/${videoId}/thumbnail?v=${encodeURIComponent(updatedAt)}`;
}

function getSyncTone(status: TrackedInspirationAccount["syncStatus"]) {
  switch (status) {
    case "ready":
      return "border-accent-green/30 bg-accent-green/10 text-accent-green";
    case "syncing":
      return "border-accent-blue/30 bg-accent-blue/10 text-accent-blue";
    case "error":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted/60 text-muted-foreground";
  }
}

function sortAccounts(accounts: TrackedInspirationAccount[]) {
  return [...accounts].sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
}

function sortVideos(videos: InspirationVideoCard[]) {
  return [...videos].sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function mergeAccountIntoState(
  accounts: TrackedInspirationAccount[],
  nextAccount: TrackedInspirationAccount
) {
  const hasExisting = accounts.some((account) => account.id === nextAccount.id);
  const merged = hasExisting
    ? accounts.map((account) =>
        account.id === nextAccount.id ? nextAccount : account
      )
    : [nextAccount, ...accounts];

  return sortAccounts(merged);
}

export function InspirationPageClient({
  initialAccounts,
}: InspirationPageClientProps) {
  const [accounts, setAccounts] = useState(() => sortAccounts(initialAccounts));
  const [activeFilter, setActiveFilter] = useState<"all" | string>("all");
  const [handleInput, setHandleInput] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [usingVideoId, setUsingVideoId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [copiedVideoId, setCopiedVideoId] = useState<string | null>(null);
  const [embedState, setEmbedState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [thumbnailErrorIds, setThumbnailErrorIds] = useState<string[]>([]);

  const selectedAccount = useMemo(
    () =>
      activeFilter === "all"
        ? null
        : accounts.find((account) => account.id === activeFilter) ?? null,
    [accounts, activeFilter]
  );

  const feedVideos = useMemo(() => {
    const sourceAccounts =
      activeFilter === "all"
        ? accounts
        : accounts.filter((account) => account.id === activeFilter);

    return sortVideos(sourceAccounts.flatMap((account) => account.videos));
  }, [accounts, activeFilter]);

  const selectedVideo = useMemo(
    () =>
      selectedVideoId
        ? accounts.flatMap((account) => account.videos).find((video) => video.id === selectedVideoId) ?? null
        : null,
    [accounts, selectedVideoId]
  );

  const trackedCreatorCount = accounts.length;
  const trackedVideoCount = accounts.reduce(
    (sum, account) => sum + account.videos.length,
    0
  );

  useEffect(() => {
    if (!selectedVideoId) {
      setEmbedState("idle");
      return;
    }

    setEmbedState("loading");
    const timer = window.setTimeout(() => {
      setEmbedState((current) => (current === "ready" ? current : "failed"));
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [selectedVideoId]);

  useEffect(() => {
    if (!selectedVideoId) return;
    if (selectedVideo) return;
    setSelectedVideoId(null);
  }, [selectedVideoId, selectedVideo]);

  useEffect(() => {
    if (!copiedVideoId) return;

    const timer = window.setTimeout(() => {
      setCopiedVideoId((current) =>
        current === copiedVideoId ? null : current
      );
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [copiedVideoId]);

  async function handleTrackAccount() {
    if (!handleInput.trim()) return;

    setIsAddingAccount(true);
    setPageError(null);

    try {
      const account = await apiPost<TrackedInspirationAccount>(
        "/api/ugc-inspiration/accounts",
        { handle: handleInput.trim() }
      );
      setAccounts((prev) => mergeAccountIntoState(prev, account));
      setHandleInput("");
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to track creator."
      );
    } finally {
      setIsAddingAccount(false);
    }
  }

  async function handleRefreshAccount(accountId: string) {
    const attemptAt = new Date().toISOString();
    setRefreshingIds((prev) =>
      prev.includes(accountId) ? prev : [...prev, accountId]
    );
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === accountId
          ? {
              ...account,
              syncStatus: "syncing",
              lastSyncAttemptAt: attemptAt,
              lastSyncError: null,
            }
          : account
      )
    );

    try {
      const refreshed = await apiPost<TrackedInspirationAccount>(
        `/api/ugc-inspiration/accounts/${accountId}/refresh`,
        {}
      );
      setAccounts((prev) => mergeAccountIntoState(prev, refreshed));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to refresh creator.";
      setPageError(message);
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === accountId
            ? {
                ...account,
                syncStatus: "error",
                lastSyncAttemptAt: attemptAt,
                lastSyncError: message,
              }
            : account
        )
      );
    } finally {
      setRefreshingIds((prev) => prev.filter((id) => id !== accountId));
    }
  }

  async function handleDeleteAccount(account: TrackedInspirationAccount) {
    if (!window.confirm(`Remove ${account.handleDisplay} from Inspiration?`)) {
      return;
    }

    setDeletingIds((prev) =>
      prev.includes(account.id) ? prev : [...prev, account.id]
    );
    setPageError(null);

    try {
      await apiDelete(`/api/ugc-inspiration/accounts/${account.id}`);
      setAccounts((prev) => prev.filter((item) => item.id !== account.id));
      if (activeFilter === account.id) {
        setActiveFilter("all");
      }
      if (selectedVideo?.accountId === account.id) {
        setSelectedVideoId(null);
      }
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to remove creator."
      );
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== account.id));
    }
  }

  async function handleUseInClone(video: InspirationVideoCard) {
    setUsingVideoId(video.id);
    setPageError(null);

    try {
      const result = await apiPost<UseInspirationResult>(
        `/api/ugc-inspiration/videos/${video.id}/use`,
        {}
      );
      window.location.assign(result.redirectTo);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to send video to Clone."
      );
    } finally {
      setUsingVideoId(null);
    }
  }

  async function handleCopySourceUrl(video: InspirationVideoCard) {
    setPageError(null);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(video.originalUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = video.originalUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopiedVideoId(video.id);
    } catch (error) {
      console.error("Failed to copy TikTok URL:", error);
      setPageError("Failed to copy TikTok URL.");
    }
  }

  function markThumbnailError(videoId: string) {
    setThumbnailErrorIds((prev) =>
      prev.includes(videoId) ? prev : [...prev, videoId]
    );
  }

  function clearThumbnailError(videoId: string) {
    setThumbnailErrorIds((prev) => prev.filter((id) => id !== videoId));
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <aside className="order-2 lg:order-1 lg:col-span-4 xl:col-span-3">
          <div className="launch-card glass border border-border/80 p-5 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Tracked Creators
                </p>
                <h2 className="mt-1 text-lg font-bold tracking-tight">
                  {trackedCreatorCount} tracked
                </h2>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {trackedVideoCount} videos
              </Badge>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "rounded-[24px] border px-4 py-3 text-left transition-all duration-300",
                  activeFilter === "all"
                    ? "border-accent-blue/40 bg-accent-blue/10"
                    : "border-border bg-card/60 hover:border-accent-blue/20 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-blue/15 text-accent-blue">
                    <Compass className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">All creators</p>
                    <p className="text-xs text-muted-foreground">
                      Combined discovery board
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </div>
              </button>

              <div className="space-y-3 lg:max-h-[calc(100vh-18rem)] lg:overflow-y-auto lg:pr-1">
                {accounts.map((account) => {
                  const isActive = activeFilter === account.id;
                  const isRefreshing = refreshingIds.includes(account.id);
                  const isDeleting = deletingIds.includes(account.id);

                  return (
                    <div
                      key={account.id}
                      className={cn(
                        "rounded-[28px] border p-4 transition-all duration-300",
                        isActive
                          ? "border-accent-green/40 bg-accent-green/10 shadow-[0_16px_40px_rgba(123,165,67,0.14)]"
                          : "border-border bg-card/70 hover:border-accent-green/25 hover:bg-card"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveFilter(account.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar size="lg">
                            <AvatarImage src={account.avatarUrl ?? undefined} alt={account.handleDisplay} />
                            <AvatarFallback>
                              {account.handleDisplay.slice(1, 3).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                  {account.displayName || account.handleDisplay}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {account.handleDisplay}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn("shrink-0 capitalize", getSyncTone(account.syncStatus))}
                              >
                                {isRefreshing ? "syncing" : account.syncStatus}
                              </Badge>
                            </div>

                            <p className="mt-2 text-xs text-muted-foreground">
                              {account.lastSyncedAt
                                ? `Updated ${formatRelativeDate(account.lastSyncedAt)}`
                                : "Not synced yet"}
                            </p>

                            {account.isStale && !isRefreshing && account.syncStatus !== "error" && (
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                Manual refresh required to pull the latest TikToks.
                              </p>
                            )}

                            {account.lastSyncError && (
                              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive">
                                <TriangleAlert className="mt-0.5 size-3 shrink-0" />
                                <span className="line-clamp-2">{account.lastSyncError}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </button>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {account.videos.length} cached videos
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleRefreshAccount(account.id)}
                            disabled={isRefreshing || isDeleting}
                            className="flex size-8 items-center justify-center rounded-2xl border border-border bg-card/70 text-muted-foreground transition-all hover:border-accent-blue/30 hover:text-accent-blue disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Refresh ${account.handleDisplay}`}
                          >
                            {isRefreshing ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="size-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteAccount(account)}
                            disabled={isDeleting}
                            className="flex size-8 items-center justify-center rounded-2xl border border-border bg-card/70 text-muted-foreground transition-all hover:border-destructive/30 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Remove ${account.handleDisplay}`}
                          >
                            {isDeleting ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <section className="order-1 lg:order-2 lg:col-span-8 xl:col-span-9">
          <div className="launch-card glass border border-border/80 p-6">
            <header className="border-b border-border pb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-sm ring-1 ring-border mb-4">
                <span className="text-accent-coral text-sm">&#9889;</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Source Selection
                </span>
              </div>

              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <h1 className="text-3xl font-extrabold tracking-tight">
                    Source Selection
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Compare creator posts, inspect portrait previews, and send
                    the strongest source straight into Clone.
                  </p>
                </div>

                <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                  <Input
                    value={handleInput}
                    onChange={(event) => setHandleInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleTrackAccount();
                      }
                    }}
                    placeholder="@creator or TikTok profile URL"
                    disabled={isAddingAccount}
                    className="h-12 rounded-2xl border-border/80 bg-card/70 px-4 text-sm"
                  />
                  <Button
                    type="button"
                    onClick={() => void handleTrackAccount()}
                    disabled={isAddingAccount || !handleInput.trim()}
                    className="h-12 rounded-2xl bg-accent-coral px-6 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(255,122,89,0.24)] hover:brightness-110"
                  >
                    {isAddingAccount ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Tracking...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Track Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </header>

            {pageError && (
              <div className="mt-5 flex items-start gap-3 rounded-[24px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{pageError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {selectedAccount ? selectedAccount.handleDisplay : "All creators"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {feedVideos.length} videos ready to browse
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                <span>{trackedCreatorCount} tracked</span>
                <span className="opacity-40">/</span>
                <span>{trackedVideoCount} cached</span>
              </div>
            </div>

            {accounts.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[32px] border border-dashed border-border bg-card/40 px-6 py-16 text-center">
                <div className="mb-5 flex size-16 items-center justify-center rounded-[24px] bg-accent-blue/12 text-accent-blue">
                  <Compass className="size-7" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">
                  Start your discovery board
                </h2>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  Add a few creators you already trust. PostForge will keep a
                  cached feed of their recent TikToks here, ready for preview
                  and one-click cloning.
                </p>
              </div>
            ) : feedVideos.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-border bg-card/40 px-6 py-14 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-[22px] bg-accent-green/12 text-accent-green">
                  <CheckCircle2 className="size-6" />
                </div>
                <h2 className="text-lg font-bold tracking-tight">
                  No cached videos yet
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {selectedAccount
                    ? `${selectedAccount.handleDisplay} is tracked, but there are no recent videos cached yet. Refresh the creator or open the profile on TikTok.`
                    : "Tracked creators are present, but no videos are cached yet."}
                </p>
                {selectedAccount?.profileUrl && (
                  <a
                    href={selectedAccount.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "mt-5 rounded-2xl"
                    )}
                  >
                    Open Profile
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {feedVideos.map((video) => {
                  const thumbnailFailed = thumbnailErrorIds.includes(video.id);

                  return (
                    <article
                      key={video.id}
                      className="group overflow-hidden rounded-[28px] border border-border bg-card transition-all duration-300 hover:-translate-y-1.5 hover:border-accent-blue/20 hover:shadow-[0_22px_60px_rgba(0,0,0,0.24)]"
                    >
                      <button
                        type="button"
                        aria-label={`Preview source from ${video.creatorHandle}`}
                        onClick={() => setSelectedVideoId(video.id)}
                        className="relative block w-full text-left"
                      >
                        <div
                          data-source-preview-frame="portrait"
                          className="aspect-[9/16] bg-zinc-950"
                        >
                          {!thumbnailFailed ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getInspirationThumbnailSrc(video.id, video.updatedAt)}
                                alt={video.caption || `${video.creatorHandle} TikTok`}
                                className="size-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                                loading="lazy"
                                onError={() => markThumbnailError(video.id)}
                                onLoad={() => clearThumbnailError(video.id)}
                              />
                            </>
                          ) : (
                            <div className="flex size-full items-center justify-center text-muted-foreground">
                              <Play className="size-8" />
                            </div>
                          )}
                        </div>

                        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
                          <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                            {formatDuration(video.durationSec)}
                          </span>
                          <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white">
                            {formatRelativeDate(video.publishedAt ?? video.createdAt)}
                          </span>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-4 pt-12 text-white">
                          <p className="truncate text-sm font-semibold">
                            {video.creatorHandle}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-white/75">
                            {video.caption || "No caption provided."}
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/80">
                            <div className="flex items-center gap-1.5">
                              <Play className="size-3" />
                              <span>{formatMetric(video.viewCount)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Heart className="size-3" />
                              <span>{formatMetric(video.likeCount)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MessageCircle className="size-3" />
                              <span>{formatMetric(video.commentCount)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Repeat2 className="size-3" />
                              <span>{formatMetric(video.shareCount)}</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      <div className="grid grid-cols-2 gap-2 border-t border-border bg-card/95 p-3">
                        <Button
                          type="button"
                          onClick={() => void handleUseInClone(video)}
                          disabled={usingVideoId === video.id}
                          className="col-span-2 h-auto min-h-9 w-full min-w-0 rounded-2xl bg-accent-green px-2 py-2 text-center text-xs font-semibold leading-tight text-white shadow-[0_12px_28px_rgba(123,165,67,0.22)] hover:brightness-110 sm:text-sm"
                        >
                          {usingVideoId === video.id ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              Use in Clone
                              <Sparkles className="size-4" />
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon-lg"
                          onClick={() => void handleCopySourceUrl(video)}
                          aria-label={
                            copiedVideoId === video.id
                              ? `Copied source URL for ${video.creatorHandle}`
                              : `Copy source URL for ${video.creatorHandle}`
                          }
                          className="w-full rounded-2xl"
                        >
                          {copiedVideoId === video.id ? (
                            <CheckCircle2 className="size-4" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </Button>

                        <a
                          href={video.originalUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open original source from ${video.creatorHandle}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "icon-lg" }),
                            "w-full rounded-2xl"
                          )}
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog open={!!selectedVideoId} onOpenChange={(open) => !open && setSelectedVideoId(null)}>
        <DialogContent
          showCloseButton
          className="max-w-[min(1120px,calc(100%-2rem))] overflow-hidden rounded-[32px] border border-border bg-card p-0 sm:max-w-[min(1120px,calc(100%-2rem))]"
        >
          {selectedVideo && (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_380px]">
              <div className="relative min-h-[360px] border-b border-border bg-black lg:min-h-[680px] lg:border-r lg:border-b-0">
                {embedState !== "failed" && (
                  <iframe
                    key={selectedVideo.id}
                    src={selectedVideo.embedUrl ?? `https://www.tiktok.com/embed/v3/${selectedVideo.externalVideoId}`}
                    title={`TikTok preview for ${selectedVideo.creatorHandle}`}
                    className={cn(
                      "size-full min-h-[360px] lg:min-h-[680px]",
                      embedState === "loading" && "opacity-0"
                    )}
                    allow="encrypted-media; picture-in-picture"
                    allowFullScreen
                    onLoad={() => setEmbedState("ready")}
                    onError={() => setEmbedState("failed")}
                  />
                )}

                {embedState === "loading" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
                    <Loader2 className="size-6 animate-spin" />
                    <p className="text-sm font-medium">Loading TikTok preview...</p>
                  </div>
                )}

                {embedState === "failed" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black px-6 text-center text-white">
                    {!thumbnailErrorIds.includes(selectedVideo.id) ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getInspirationThumbnailSrc(
                            selectedVideo.id,
                            selectedVideo.updatedAt
                          )}
                          alt={selectedVideo.caption || `${selectedVideo.creatorHandle} TikTok`}
                          className="max-h-[440px] rounded-[28px] object-contain shadow-2xl"
                          onError={() => markThumbnailError(selectedVideo.id)}
                          onLoad={() => clearThumbnailError(selectedVideo.id)}
                        />
                      </>
                    ) : (
                      <div className="flex size-20 items-center justify-center rounded-[28px] bg-white/10">
                        <Play className="size-8" />
                      </div>
                    )}
                    <div>
                      <p className="text-base font-semibold">
                        TikTok preview unavailable
                      </p>
                      <p className="mt-2 max-w-md text-sm text-white/70">
                        The embed could not load for this post. You can still
                        open it on TikTok or send it directly into Clone.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col bg-card">
                <div className="border-b border-border px-6 py-5">
                  <div className="flex items-start gap-3">
                    <Avatar size="lg">
                      <AvatarImage
                        src={selectedVideo.creatorAvatarUrl ?? undefined}
                        alt={selectedVideo.creatorHandle}
                      />
                      <AvatarFallback>
                        {selectedVideo.creatorHandle.slice(1, 3).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <DialogTitle className="truncate text-lg font-bold tracking-tight">
                        {selectedVideo.creatorDisplayName || selectedVideo.creatorHandle}
                      </DialogTitle>
                      <DialogDescription className="mt-1 truncate">
                        {selectedVideo.creatorHandle}
                      </DialogDescription>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-5 px-6 py-5">
                  <div className="rounded-[24px] border border-border bg-muted/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Caption
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/85">
                      {selectedVideo.caption || "No caption available for this post."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] border border-border bg-card/80 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Views
                      </p>
                      <p className="mt-2 text-lg font-bold">
                        {formatMetric(selectedVideo.viewCount)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-border bg-card/80 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Likes
                      </p>
                      <p className="mt-2 text-lg font-bold">
                        {formatMetric(selectedVideo.likeCount)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-border bg-card/80 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Comments
                      </p>
                      <p className="mt-2 text-lg font-bold">
                        {formatMetric(selectedVideo.commentCount)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-border bg-card/80 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Shares
                      </p>
                      <p className="mt-2 text-lg font-bold">
                        {formatMetric(selectedVideo.shareCount)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-border bg-card/80 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Post Details
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between gap-4">
                        <span>Published</span>
                        <span className="text-right text-foreground/90">
                          {formatPublishedDate(selectedVideo.publishedAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Runtime</span>
                        <span className="text-right text-foreground/90">
                          {formatDuration(selectedVideo.durationSec)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border bg-muted/35 px-6 py-5">
                  <div className="flex flex-col gap-3">
                    <Button
                      type="button"
                      onClick={() => void handleUseInClone(selectedVideo)}
                      disabled={usingVideoId === selectedVideo.id}
                      className="h-11 rounded-2xl bg-accent-green text-white shadow-[0_16px_40px_rgba(123,165,67,0.24)] hover:brightness-110"
                    >
                      {usingVideoId === selectedVideo.id ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Sending to Clone...
                        </>
                      ) : (
                        <>
                          Use in Clone
                          <Sparkles className="size-4" />
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => void handleCopySourceUrl(selectedVideo)}
                      className="h-11 rounded-2xl"
                    >
                      {copiedVideoId === selectedVideo.id ? (
                        <>
                          URL Copied
                          <CheckCircle2 className="size-4" />
                        </>
                      ) : (
                        <>
                          Copy TikTok URL
                          <Copy className="size-4" />
                        </>
                      )}
                    </Button>

                    <a
                      href={selectedVideo.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "lg" }),
                        "h-11 rounded-2xl"
                      )}
                    >
                      Open on TikTok
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
