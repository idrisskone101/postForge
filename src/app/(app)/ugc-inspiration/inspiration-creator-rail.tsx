"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/workbench/icon";
import { iconButtonClass } from "@/components/workbench/icon-button";
import { cn } from "@/lib/utils";
import type { TrackedInspirationAccount } from "@/lib/inspiration/types";
import { getCreatorSyncMeta, getInspirationAvatarSrc } from "./inspiration-models";
import type { InspirationWorkspace } from "./types";

export function InspirationCreatorRail({ workspace }: { workspace: InspirationWorkspace }) {
  const {
    accounts,
    activeFilter,
    setActiveFilter,
    refreshingIds,
    trackedVideoCount,
    accountCursor,
    isLoadingMoreAccounts,
    handleRefreshAccount,
    handleLoadMoreAccounts,
  } = workspace;
  const refreshingAll = refreshingIds.length > 0;

  return (
    <section
      aria-labelledby="tracked-creators-heading"
      className="wb-panel min-w-0 gap-2.5 px-3 pt-[18px] pb-3 max-md:pt-3.5 lg:w-[264px] lg:flex-none"
    >
      <div className="flex h-8 items-center justify-between px-2 max-md:h-[30px]">
        <h2 id="tracked-creators-heading" className="wb-panel-title">
          Tracked creators
        </h2>
        <button
          type="button"
          onClick={() =>
            accounts.forEach((account) => {
              if (!refreshingIds.includes(account.id)) void handleRefreshAccount(account.id);
            })
          }
          disabled={accounts.length === 0 || refreshingAll}
          aria-label={refreshingAll ? "Refreshing creators" : "Refresh all creators"}
          title="Refresh all creators"
          className={iconButtonClass("quiet", 30)}
        >
          <Icon name="refresh" size={14} />
        </button>
      </div>

      <ul
        aria-label="Creators"
        className="wb-scroll-fade -mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 max-lg:snap-x max-lg:overscroll-x-contain lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:[mask-image:none]"
      >
        <li className="max-md:w-[168px] md:max-lg:w-[200px] max-lg:flex-none max-lg:snap-start">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            aria-pressed={activeFilter === "all"}
            className={ROW_CLASS}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-raised-strong text-fg">
              <Icon name="grid" size={16} />
            </span>
            <RowText
              title="All creators"
              meta={`${trackedVideoCount} ${trackedVideoCount === 1 ? "post" : "posts"}`}
              active={activeFilter === "all"}
            />
          </button>
        </li>
        {accounts.map((account) => (
          <CreatorRow key={account.id} account={account} workspace={workspace} />
        ))}
        {accountCursor ? (
          <li className="flex max-lg:flex-none max-lg:items-center">
            <button
              type="button"
              onClick={() => void handleLoadMoreAccounts()}
              disabled={isLoadingMoreAccounts}
              data-inspiration-load-more-accounts="true"
              className="wb-btn wb-btn-32 w-full max-lg:w-auto max-lg:whitespace-nowrap lg:mt-1"
            >
              {isLoadingMoreAccounts ? "Loading creators" : "Load more creators"}
            </button>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

const ROW_CLASS = [
  "flex w-full min-w-0 items-center gap-2.5 rounded-lg p-2.5 text-left",
  "transition-[background-color] duration-[var(--pf-dur-feedback)] ease-pf",
  "hover:bg-raised/60 aria-pressed:bg-raised",
  "focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--pf-ember)]",
].join(" ");

const META_TONE = {
  live: "text-ember-text",
  warn: "text-warn",
  muted: "text-fg-muted",
} as const;

function CreatorRow({
  account,
  workspace,
}: {
  account: TrackedInspirationAccount;
  workspace: InspirationWorkspace;
}) {
  const { activeFilter, setActiveFilter, refreshingIds, deletingIds } = workspace;
  const isActive = activeFilter === account.id;
  const isRefreshing = refreshingIds.includes(account.id);
  const isDeleting = deletingIds.includes(account.id);
  const sync = getCreatorSyncMeta(account, isRefreshing);

  return (
    <li
      className={cn(
        "flex min-w-0 flex-col rounded-lg max-lg:w-[220px] max-lg:flex-none max-lg:snap-start",
        isActive && "gap-2.5 bg-raised pb-2.5"
      )}
      title={account.lastSyncError ?? undefined}
    >
      <button
        type="button"
        onClick={() => setActiveFilter(account.id)}
        aria-pressed={isActive}
        className={cn(ROW_CLASS, isActive && "pb-0 hover:bg-transparent aria-pressed:bg-transparent")}
      >
        <CreatorAvatar account={account} />
        <RowText
          title={account.handleDisplay}
          meta={
            <>
              {sync.tone === "live" && <span aria-hidden="true" className="mr-1.5 inline-block size-1.5 rounded-full bg-ember align-middle" />}
              {sync.label}
            </>
          }
          metaClassName={META_TONE[sync.tone]}
          active={isActive}
        />
      </button>
      {isActive && (
        <div className="flex gap-1.5 px-2.5">
          <button
            type="button"
            onClick={() => void workspace.handleRefreshAccount(account.id)}
            disabled={isRefreshing || isDeleting}
            aria-label={`Refresh ${account.handleDisplay}`}
            className="wb-btn wb-btn-strong h-[30px] min-h-0 flex-1 gap-1.5 px-0 text-[12px] leading-4"
          >
            <Icon name="refresh" size={14} className="size-3.5" />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => void workspace.handleDeleteAccount(account)}
            disabled={isDeleting}
            aria-label={`Remove ${account.handleDisplay}`}
            className="wb-btn wb-btn-strong h-[30px] min-h-0 flex-1 px-0 text-[12px] leading-4 text-fg-secondary"
          >
            {isDeleting ? "Removing" : "Remove"}
          </button>
        </div>
      )}
    </li>
  );
}

function RowText({
  title,
  meta,
  metaClassName = "text-fg-muted",
  active,
}: {
  title: string;
  meta: ReactNode;
  metaClassName?: string;
  active: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span
        className={cn(
          "truncate text-[14px] leading-[18px] text-fg",
          active ? "font-semibold" : "font-medium"
        )}
      >
        {title}
      </span>
      <span
        className={cn(
          "truncate text-[12px] leading-4",
          active && metaClassName === "text-fg-muted" ? "text-fg-secondary" : metaClassName
        )}
        suppressHydrationWarning
      >
        {meta}
      </span>
    </span>
  );
}

function CreatorAvatar({ account }: { account: TrackedInspirationAccount }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarSrc =
    account.avatarUrl && !avatarFailed
      ? getInspirationAvatarSrc(account.id, account.updatedAt)
      : null;

  return (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-media text-[12px] font-semibold text-fg-secondary">
      {avatarSrc ? (
        <Image
          src={avatarSrc}
          alt=""
          width={36}
          height={36}
          unoptimized
          className="size-full object-cover"
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        account.handleDisplay.slice(1, 3).toUpperCase()
      )}
    </span>
  );
}
