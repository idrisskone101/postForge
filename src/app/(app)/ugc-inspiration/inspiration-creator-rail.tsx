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
import type { InspirationWorkspace } from "./types";

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
          <span className="sr-only">
            Choose a creator to narrow the source library.
          </span>
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
            "flex w-auto shrink-0 snap-start items-center gap-2.5 rounded-[8px] border px-3 py-2.5 text-left transition-colors duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            activeFilter === "all"
              ? "border-primary bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] ring-1 ring-primary/25"
              : "pf-card hover:bg-[var(--pf-active)]"
          )}
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              activeFilter === "all"
                ? "bg-[var(--pf-surface)]/40"
                : "bg-[var(--pf-active)] text-[var(--pf-muted)]"
            )}
          >
            <Compass className="size-4" />
          </span>
          <span
            data-lcp="Creator Feed"
            className="whitespace-nowrap text-[13px] font-semibold"
          >
            <span className="sr-only">Creator Feed</span>
          </span>
          <span
            className={cn(
              "pf-data text-[11px] font-semibold",
              activeFilter === "all"
                ? "text-[var(--sidebar-accent-foreground)]"
                : "text-[var(--pf-muted)]"
            )}
          >
            {trackedVideoCount}
          </span>
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
                "group flex w-[13.5rem] max-w-[calc(100vw-3rem)] shrink-0 snap-start items-center rounded-[8px] border pr-1.5 transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                isActive
                  ? "border-primary bg-[var(--sidebar-accent)] ring-1 ring-primary/25"
                  : "pf-card hover:bg-[var(--pf-active)]"
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
                  <span
                    data-lcp={account.handleDisplay}
                    className="block truncate text-xs font-semibold text-[var(--pf-ink)]"
                  >
                    <span className="sr-only">{account.handleDisplay}</span>
                  </span>
                  <span
                    data-lcp={syncMeta.label}
                    className={cn("mt-0.5 block truncate text-[11px]", syncMeta.className)}
                  >
                    <span className="sr-only">{syncMeta.label}</span>
                  </span>
                </span>
                <span
                  data-lcp={String(account.videoCount)}
                  className="pf-data text-[11px] font-semibold text-[var(--pf-muted)]"
                >
                  <span className="sr-only">{account.videoCount}</span>
                </span>
              </button>
              <span className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => void handleRefreshAccount(account.id)}
                  disabled={isRefreshing || isDeleting}
                  className="flex size-6 items-center justify-center rounded-[6px] text-[var(--pf-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)] disabled:opacity-50"
                  aria-label={`Refresh ${account.handleDisplay}`}
                >
                  {isRefreshing ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3" />
                  )}
                  <span className="sr-only">Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount(account)}
                  disabled={isDeleting}
                  className="flex size-6 items-center justify-center rounded-[6px] text-[var(--pf-muted)] hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)] disabled:opacity-50"
                  aria-label={`Remove ${account.handleDisplay}`}
                >
                  {isDeleting ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                  <span className="sr-only">Remove</span>
                </button>
              </span>
              {account.lastSyncError && (
                <span className="sr-only">{account.lastSyncError}</span>
              )}
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
            className="pf-card flex w-auto shrink-0 snap-start items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--pf-active)] disabled:opacity-50"
          >
            {isLoadingMoreAccounts ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span className="whitespace-nowrap text-[13px] font-semibold text-[var(--pf-ink)]">
                Load more
              </span>
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
    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--pf-border)] bg-[var(--pf-active)] text-[11px] font-medium text-[var(--pf-muted)]">
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
