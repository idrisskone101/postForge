"use client";

import Link from "next/link";
import { ExternalLink, Loader2, RefreshCw, Unplug } from "lucide-react";
import type { ConnectedIntegrationAccountStatus } from "@/lib/integrations-client";
import { cn } from "@/lib/utils";
import type { AccountRowModel } from "./types";

export function AccountRow({ row }: { row: AccountRowModel }) {
  const {
    providerStatus,
    displayName,
    account,
    busy,
    onSync,
    onDisconnect,
    onReconnect,
    canStartOAuth,
  } = row;
  const { account: info } = account;
  const accountName = info.displayName || info.username || `${displayName} account`;
  const accountUsername = formatAccountUsername(info.username);
  const authorizationRequired = account.authorization.status !== "healthy";
  const syncTone = syncToneClass(account, authorizationRequired);
  const syncLabel = syncStatusLabel(account, authorizationRequired);

  return (
    <div className="grid min-w-0 gap-2 rounded-lg border border-border bg-[var(--pf-surface)] p-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-[12px] font-bold text-[var(--pf-canvas)]">
          {accountName.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[11px]">{accountName}</b>
          <small className="mt-0.5 block truncate text-[11px] text-muted-foreground">{accountUsername}</small>
        </span>
        {info.profileUrl && (
          <Link
            href={info.profileUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${displayName} profile`}
            className="grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-[var(--pf-surface)]"
          >
            <ExternalLink className="size-3" />
          </Link>
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap gap-1">
          {(["metrics", "publish"] as const).map((capability) => (
            <span
              key={capability}
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[11px] font-semibold",
                account.capabilities[capability]
                  ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                  : "border-border bg-[var(--pf-surface)] text-muted-foreground"
              )}
            >
              {capabilityCaption(capability, account)}
            </span>
          ))}
        </div>
        <span className={cn("rounded-full border px-1.5 py-0.5 text-[11px] font-semibold", syncTone)}>
          {syncLabel}
        </span>
        {authorizationRequired && (
          <span className="rounded-full border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--pf-danger)]">
            Authorization required
          </span>
        )}
      </div>
      {account.sync.status === "ready" && account.sync.lastSuccessfulAt && (
        <p className="min-w-0 break-words text-[11px] leading-4 text-muted-foreground [overflow-wrap:anywhere] lg:col-span-2">
          Last synced{" "}
          <time dateTime={account.sync.lastSuccessfulAt}>
            {formatConnectionDate(account.sync.lastSuccessfulAt)}
          </time>
        </p>
      )}
      {account.publishingUnavailableReason && (
        <p className="min-w-0 break-words text-[11px] leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere] lg:col-span-2">
          {account.publishingUnavailableReason}
        </p>
      )}
      {account.sync.status === "error" && account.sync.warnings[0] && (
        <p className="min-w-0 break-words text-[11px] leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere] lg:col-span-2">
          {account.sync.warnings[0]}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5 lg:col-span-2">
        <button
          type="button"
          onClick={() => (authorizationRequired ? onReconnect() : onSync(providerStatus, account.account.id))}
          disabled={busy || (authorizationRequired && !canStartOAuth)}
          className="pf-button-secondary h-7 px-2.5 text-[12px]"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}{" "}
          {authorizationRequired ? "Reconnect" : "Sync"}
        </button>
        <button
          type="button"
          onClick={() => onDisconnect(providerStatus, account.account.id)}
          disabled={busy}
          className="pf-button-secondary h-7 px-2.5 text-[12px] text-[var(--pf-danger)]"
        >
          <Unplug className="size-3" /> Disconnect
        </button>
      </div>
    </div>
  );
}

function formatAccountUsername(username: string | null | undefined): string {
  if (!username) return "Username unavailable";
  if (username.startsWith("@")) return username;
  return `@${username}`;
}

function capabilityName(
  capability: "metrics" | "publish",
  account: ConnectedIntegrationAccountStatus
): string {
  if (capability === "metrics") return "Metrics";
  if (account.publishingUnavailableReason) return "Upload runtime";
  return "Upload scope";
}

function capabilityCaption(
  capability: "metrics" | "publish",
  account: ConnectedIntegrationAccountStatus
): string {
  const name = capabilityName(capability, account);
  if (account.capabilities[capability]) return `${name} verified`;
  if (capability === "publish" && account.publishingUnavailableReason) {
    return `${name} unavailable`;
  }
  return `${name} not granted`;
}

function syncToneClass(
  account: ConnectedIntegrationAccountStatus,
  authorizationRequired: boolean
): string {
  if (authorizationRequired || account.sync.status === "error") {
    return "border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]";
  }
  if (account.sync.status === "partial") {
    return "border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10 text-[var(--pf-lamp-amber)]";
  }
  if (account.sync.status === "ready") {
    return "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]";
  }
  return "border-border bg-[var(--pf-active)] text-muted-foreground";
}

function syncStatusLabel(
  account: ConnectedIntegrationAccountStatus,
  authorizationRequired: boolean
): string {
  if (authorizationRequired) return "Reconnect required";
  if (account.sync.status === "error") return "Sync error";
  if (account.sync.status === "partial") return "Partially synced";
  if (account.sync.status === "ready") return "Ready";
  return "Not synced";
}

function formatConnectionDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "at an unknown time";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
