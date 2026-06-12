"use client";

import Image from "next/image";
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
import { WorkspaceHeaderAccessory } from "@/components/workspace-shell";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
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
  Settings2,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";

interface InspirationPageClientProps {
  initialAccounts: TrackedInspirationAccount[];
}

interface InspirationHeaderControlsProps {
  handleInput: string;
  isAddingAccount: boolean;
  onHandleInputChange: (value: string) => void;
  onTrackAccount: () => void;
}

export function InspirationHeaderControls({
  handleInput,
  isAddingAccount,
  onHandleInputChange,
  onTrackAccount,
}: InspirationHeaderControlsProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:p-3 lg:max-w-[780px] lg:flex-row lg:items-center lg:gap-3">
      <div className="hidden min-w-0 flex-1 lg:block">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Source Selection
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground lg:line-clamp-1">
          Compare creator posts, inspect portrait previews, and send the
          strongest source straight into Clone.
        </p>
      </div>

      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_2.25rem] gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-[25rem]">
        <Input
          value={handleInput}
          onChange={(event) => onHandleInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onTrackAccount();
            }
          }}
          placeholder="@creator or TikTok profile URL"
          disabled={isAddingAccount}
          className="h-9 min-w-0 rounded-lg border-border bg-background/60 px-3 text-xs"
        />
        <Button
          type="button"
          onClick={onTrackAccount}
          disabled={isAddingAccount || !handleInput.trim()}
          className="h-9 min-w-0 shrink-0 rounded-lg bg-accent-coral px-0 text-xs font-semibold text-white hover:brightness-110 sm:px-3"
        >
          {isAddingAccount ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span className="hidden sm:inline">Tracking...</span>
              <span className="sr-only sm:hidden">Tracking creator</span>
            </>
          ) : (
            <>
              <Users className="size-4" />
              <span className="hidden sm:inline">Track Creator</span>
              <span className="sr-only sm:hidden">Track Creator</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
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

function getInspirationAvatarSrc(accountId: string, updatedAt: string): string {
  return `/api/ugc-inspiration/accounts/${accountId}/avatar?v=${encodeURIComponent(updatedAt)}`;
}

function getCreatorSyncMeta(
  account: TrackedInspirationAccount,
  isRefreshing: boolean
) {
  if (isRefreshing) {
    return {
      label: "Syncing now",
      className: "text-accent-blue",
    };
  }

  if (account.syncStatus === "error") {
    return {
      label: "Sync failed",
      className: "text-destructive",
    };
  }

  return {
    label: account.lastSyncedAt
      ? `Synced ${formatRelativeDate(account.lastSyncedAt)}`
      : "Not synced yet",
    className:
      account.syncStatus === "ready" && !account.isStale
        ? "text-accent-green"
        : "text-muted-foreground",
  };
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

function CreatorSyncAvatar({
  account,
}: {
  account: TrackedInspirationAccount;
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarSrc =
    account.avatarUrl && !avatarFailed
      ? getInspirationAvatarSrc(account.id, account.updatedAt)
      : null;
  const fallback = account.handleDisplay.slice(1, 3).toUpperCase();

  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-zinc-800 text-[10px] font-medium text-muted-foreground">
      {avatarSrc ? (
        <Image
          src={avatarSrc}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="size-full object-cover"
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        fallback
      )}
    </span>
  );
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
  const [creatorSyncManageOpen, setCreatorSyncManageOpen] = useState(false);

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
  const topAccount = useMemo(
    () =>
      [...accounts].sort((a, b) => b.videos.length - a.videos.length)[0] ??
      null,
    [accounts]
  );
  const sourceScopeLabel = selectedAccount
    ? selectedAccount.handleDisplay
    : "Recent Discoveries";

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
      <WorkspaceHeaderAccessory>
        <InspirationHeaderControls
          handleInput={handleInput}
          isAddingAccount={isAddingAccount}
          onHandleInputChange={setHandleInput}
          onTrackAccount={() => void handleTrackAccount()}
        />
      </WorkspaceHeaderAccessory>

      <div className="flex min-h-[calc(100vh-76px)] overflow-hidden">
        <aside className="hidden w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-black/10 p-6 xl:flex">
          <section>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Sources
            </h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  activeFilter === "all"
                    ? "border border-white/10 bg-white/5 text-accent-blue"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <span>Recent Discoveries</span>
                <span className="rounded bg-accent-blue/20 px-1.5 text-[10px]">
                  {trackedVideoCount}
                </span>
              </button>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Creator Sync
              </h3>
              <button
                type="button"
                onClick={() => setCreatorSyncManageOpen((open) => !open)}
                aria-pressed={creatorSyncManageOpen}
                className={cn(
                  "flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground",
                  creatorSyncManageOpen && "bg-white/5 text-foreground"
                )}
                aria-label={
                  creatorSyncManageOpen
                    ? "Hide creator sync actions"
                    : "Show creator sync actions"
                }
              >
                <Settings2 className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              {accounts.map((account) => {
                const isActive = activeFilter === account.id;
                const isRefreshing = refreshingIds.includes(account.id);
                const isDeleting = deletingIds.includes(account.id);
                const syncMeta = getCreatorSyncMeta(account, isRefreshing);

                return (
                  <div
                    key={account.id}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg py-0.5 transition-colors",
                      isActive && "text-accent-blue"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFilter(account.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <CreatorSyncAvatar account={account} />

                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {account.handleDisplay}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 truncate text-[10px] font-medium",
                            syncMeta.className
                          )}
                        >
                          {syncMeta.label}
                        </p>
                      </div>
                    </button>

                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-1",
                        creatorSyncManageOpen
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => void handleRefreshAccount(account.id)}
                        disabled={isRefreshing || isDeleting}
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-accent-blue disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Remove ${account.handleDisplay}`}
                      >
                        {isDeleting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    </div>

                    {account.lastSyncError && (
                      <span className="sr-only">{account.lastSyncError}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            {pageError && (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{pageError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  New Sources
                </p>
                <p className="text-2xl font-bold">{feedVideos.length}</p>
                <p className="mt-2 text-xs text-accent-green">
                  {sourceScopeLabel}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Tracked Creators
                </p>
                <p className="text-2xl font-bold">{trackedCreatorCount}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {trackedVideoCount} cached videos
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Top Creator
                </p>
                <p className="truncate text-2xl font-bold">
                  {topAccount?.handleDisplay ?? "None"}
                </p>
                <p className="mt-2 text-xs text-accent-blue">
                  {topAccount ? `${topAccount.videos.length} Sources active` : "Track a creator to start"}
                </p>
              </div>
            </div>

            {accounts.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white/[0.01] px-6 py-16 text-center">
                <div className="mb-5 flex size-16 items-center justify-center rounded-xl bg-accent-blue/12 text-accent-blue">
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
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white/[0.01] px-6 py-14 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-accent-green/12 text-accent-green">
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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {feedVideos.map((video) => {
                  const thumbnailFailed = thumbnailErrorIds.includes(video.id);

                  return (
                    <article
                      key={video.id}
                      className="group flex flex-col gap-3"
                    >
                      <button
                        type="button"
                        aria-label={`Preview source from ${video.creatorHandle}`}
                        onClick={() => setSelectedVideoId(video.id)}
                        className="relative block w-full overflow-hidden rounded-xl border border-border bg-black text-left transition-colors hover:border-accent-blue/40"
                      >
                        <div
                          data-source-preview-frame="portrait"
                          className="aspect-[9/16] max-h-[480px] bg-zinc-950"
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
                          <span className="rounded-md border border-white/10 bg-black/80 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-md">
                            9:16
                          </span>
                          <span className="rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                            {formatRelativeDate(video.publishedAt ?? video.createdAt)}
                          </span>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-4 pt-12 text-white">
                          <p className="truncate text-[11px] font-semibold">
                            {video.creatorHandle}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[10px] text-white/55">
                            {video.caption || "No caption provided."}
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/80">
                            <div className="flex items-center gap-1.5">
                              <Play className="size-3" />
                              <span>{formatDuration(video.durationSec)}</span>
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

                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          onClick={() => void handleUseInClone(video)}
                          disabled={usingVideoId === video.id}
                          className="h-11 w-full rounded-xl bg-accent-green text-sm font-bold text-white hover:brightness-110"
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

                        <div className="grid grid-cols-[minmax(0,1fr)_2.25rem_2.25rem] gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedVideoId(video.id)}
                            className="h-9 min-w-0 rounded-lg bg-white/5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                          >
                            Preview Details
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
                            className="size-9 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground"
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
                              "size-9 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        </div>
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
