"use client";

import Image from "next/image";
import { useState } from "react";
import { Compass, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrackedInspirationAccount } from "@/lib/inspiration/types";
import {
  getCreatorSyncMeta,
  getInspirationAvatarSrc,
} from "./inspiration-models";
import type { InspirationWorkspace } from "./use-inspiration-workspace";

export function InspirationCreatorRail({
  workspace,
}: {
  workspace: InspirationWorkspace;
}) {
  const {
    accounts,
    activeFilter,
    setActiveFilter,
    refreshingIds,
    deletingIds,
    trackedVideoCount,
    accountCursor,
    isLoadingMoreAccounts,
    handleRefreshAccount,
    handleDeleteAccount,
    handleLoadMoreAccounts,
  } = workspace;

  return (
    <section
      aria-labelledby="tracked-creators-heading"
      className="min-w-0 max-w-full overflow-hidden [contain:inline-size_layout_paint]"
    >
      <div className="mb-3">
        <h2 id="tracked-creators-heading" data-lcp="Tracked creators">
          <span className="sr-only">Tracked creators</span>
        </h2>
        <p data-lcp="Choose a creator to narrow the source library.">
          <span className="sr-only">Choose a creator to narrow the source library.</span>
        </p>
      </div>

      <div
        data-creator-list="true"
        data-creator-scroll-viewport="true"
        className="flex w-full min-w-0 max-w-full snap-x gap-2 overflow-x-auto overscroll-x-contain pb-2 [contain:inline-size]"
      >
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          title="All tracked creator videos"
          className={cn(
            "flex w-auto shrink-0 snap-start items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            activeFilter === "all"
              ? "border-foreground/20 bg-foreground text-background shadow-[var(--pf-shadow-2xs)]"
              : "border-border bg-card shadow-[var(--pf-shadow-2xs)] hover:bg-muted/60"
          )}
        >
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", activeFilter === "all" ? "bg-background/15" : "bg-muted text-muted-foreground")}>
            <Compass className="size-4" />
          </span>
          <span data-lcp="Creator Feed" className="whitespace-nowrap text-[13px] font-semibold">
            <span className="sr-only">Creator Feed</span>
          </span>
          <span className={cn("text-[11px] font-semibold tabular-nums", activeFilter === "all" ? "text-background/70" : "text-muted-foreground")}>{trackedVideoCount}</span>
        </button>

        {accounts.map((account) => {
          const isActive = activeFilter === account.id;
          const isRefreshing = refreshingIds.includes(account.id);
          const isDeleting = deletingIds.includes(account.id);
          const syncMeta = getCreatorSyncMeta(account, isRefreshing);

          return (
            <div
              key={account.id}
              className={cn(
                "group flex w-[13.5rem] max-w-[calc(100vw-3rem)] shrink-0 snap-start items-center rounded-lg border pr-1.5 transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                isActive
                  ? "border-foreground/20 bg-card shadow-[var(--pf-shadow-sm)]"
                  : "border-border bg-card shadow-[var(--pf-shadow-2xs)] hover:bg-muted/40 hover:shadow-[var(--pf-shadow-2xs)]"
              )}
            >
              <button
                type="button"
                onClick={() => setActiveFilter(account.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left"
                title={`${account.handleDisplay} · ${syncMeta.label}`}
              >
                <CreatorSyncAvatar account={account} />
                <span className="min-w-0 flex-1">
                  <span data-lcp={account.handleDisplay} className="block truncate text-xs font-semibold">
                    <span className="sr-only">{account.handleDisplay}</span>
                  </span>
                  <span data-lcp={syncMeta.label} className={cn("mt-0.5 block truncate text-[11px]", syncMeta.className)}>
                    <span className="sr-only">{syncMeta.label}</span>
                  </span>
                </span>
                <span data-lcp={String(account.videoCount)} className="text-[11px] font-semibold text-muted-foreground">
                  <span className="sr-only">{account.videoCount}</span>
                </span>
              </button>
              <span className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => void handleRefreshAccount(account.id)}
                  disabled={isRefreshing || isDeleting}
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  aria-label={`Refresh ${account.handleDisplay}`}
                >
                  {isRefreshing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                  <span className="sr-only">Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount(account)}
                  disabled={isDeleting}
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  aria-label={`Remove ${account.handleDisplay}`}
                >
                  {isDeleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                  <span className="sr-only">Remove</span>
                </button>
              </span>
              {account.lastSyncError && <span className="sr-only">{account.lastSyncError}</span>}
            </div>
          );
        })}
        {accountCursor ? (
          <button
            type="button"
            onClick={() => void handleLoadMoreAccounts()}
            disabled={isLoadingMoreAccounts}
            data-inspiration-load-more-accounts="true"
            title="Load more tracked creators"
            className="flex w-auto shrink-0 snap-start items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-left shadow-[var(--pf-shadow-2xs)] transition-colors duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted/60 disabled:opacity-50"
          >
            {isLoadingMoreAccounts ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span className="whitespace-nowrap text-[13px] font-semibold">Load more</span>
            )}
          </button>
        ) : null}
      </div>
    </section>
  );
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
    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[11px] font-medium text-muted-foreground">
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