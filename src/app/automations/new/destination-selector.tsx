"use client";

import Link from "next/link";
import { Inbox, Loader2, ShieldCheck, X } from "lucide-react";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import {
  AUTOMATION_SOCIAL_DESTINATIONS,
  automationDestinationLabel,
  integrationAccountLabel,
  resolveAutomationDestination,
  type AutomationDestination,
} from "@/lib/automations";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

export function DestinationSelector({
  destination,
  accountId,
  providers,
  loading,
  error,
  onSelect,
  onAccountSelect,
  onRetry,
}: {
  destination: AutomationDestination;
  accountId: string | null;
  providers: readonly PublicIntegrationStatus[];
  loading: boolean;
  error: string | null;
  onSelect: (destination: AutomationDestination) => void;
  onAccountSelect: (accountId: string, accountLabel: string) => void;
  onRetry: () => void;
}) {
  const readiness = resolveAutomationDestination(
    destination,
    providers,
    destination === "manual" ? undefined : accountId
  );
  const providerStatus = readiness.providerStatus;
  const options: readonly {
    id: AutomationDestination;
    label: string;
  }[] = [
    { id: "manual", label: "Review queue" },
    ...AUTOMATION_SOCIAL_DESTINATIONS,
  ];

  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold text-muted-foreground">
        Destination
      </legend>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => {
          const optionReadiness = resolveAutomationDestination(
            option.id,
            providers
          );
          const selected = destination === option.id;
          const statusLabel =
            option.id === "manual"
              ? "Local review"
              : loading
                ? "Checking…"
                : error || optionReadiness.code === "unavailable"
                  ? "Unavailable"
                  : optionReadiness.ready
                    ? "Ready"
                    : optionReadiness.code === "missing_publish"
                      ? "Scope missing"
                      : optionReadiness.code === "not_configured"
                        ? "Not configured"
                        : "Disconnected";
          return (
            <button
              type="button"
              key={option.id}
              onClick={() => onSelect(option.id)}
              aria-pressed={selected}
              className={cn(
                "flex min-h-14 items-center gap-2 rounded-lg border bg-white px-2.5 text-left transition-colors",
                selected
                  ? "border-[var(--pf-ink)] ring-2 ring-[var(--pf-ink)]/10"
                  : "border-border hover:border-[var(--pf-border-strong)]"
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center">
                {option.id === "manual" ? (
                  <span className="grid size-6 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
                    <Inbox className="size-3.5" />
                  </span>
                ) : (
                  <SocialProviderIcon
                    provider={option.id}
                    label={option.label}
                    youtubeVariant="shorts"
                    className="size-6"
                  />
                )}
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[11px]">{option.label}</b>
                <small
                  className={cn(
                    "mt-0.5 block truncate text-[11px]",
                    optionReadiness.ready || option.id === "manual"
                      ? "text-[var(--pf-success)]"
                      : "text-[var(--pf-danger)]"
                  )}
                >
                  {statusLabel}
                </small>
              </span>
            </button>
          );
        })}
      </div>

      {destination !== "manual" && (
        <div
          className={cn(
            "mt-2 rounded-lg border p-3 text-[11px]",
            readiness.ready
              ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10"
              : "border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10"
          )}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Checking the live {automationDestinationLabel(destination)} connection…
            </div>
          ) : error ? (
            <div>
              <b className="flex items-center gap-1.5 text-[var(--pf-danger)]">
                <X className="size-3" /> Connection check failed
              </b>
              <p className="mt-1 min-w-0 break-words leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere]">
                {error}. This destination will remain gated.
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 font-semibold text-[var(--pf-danger)]"
              >
                Check again →
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <b className={readiness.ready ? "text-[var(--pf-success)]" : "text-[var(--pf-danger)]"}>
                    {readiness.ready ? "Connection verified" : "Connection required"}
                  </b>
                  <p className="mt-1 min-w-0 break-words leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere]">
                    {readiness.message}
                  </p>
                </span>
                {providerStatus && (
                  <SocialProviderIcon
                    provider={providerStatus.provider}
                    label={providerStatus.displayName}
                    youtubeVariant="shorts"
                    className="size-7 shrink-0"
                  />
                )}
              </div>

              {providerStatus?.connected && providerStatus.accounts.length > 0 && (
                <label className="mt-3 block border-t border-black/8 pt-3">
                  <span className="mb-1.5 block text-[12px] font-semibold text-muted-foreground">
                    Connected account
                  </span>
                  <select
                    value={accountId ?? ""}
                    onChange={(event) => {
                      const selected = providerStatus.accounts.find(
                        (candidate) =>
                          candidate.account.id === event.target.value
                      );
                      onAccountSelect(
                        event.target.value,
                        selected
                          ? integrationAccountLabel(selected.account) ??
                              "Connected account"
                          : "Connected account"
                      );
                    }}
                    className="h-9 w-full rounded-lg border border-border bg-white px-2 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                    aria-label="Connected social account"
                  >
                    <option value="" disabled>
                      Select one of the connected accounts
                    </option>
                    {providerStatus.accounts.map((candidate) => (
                      <option
                        key={candidate.account.id}
                        value={candidate.account.id}
                      >
                        {integrationAccountLabel(candidate.account) ??
                          "Connected account"}
                        {candidate.capabilities.publish ? "" : " (no upload scope)"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {providerStatus && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-[var(--pf-surface)] px-2 py-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="size-3.5" /> Upload capability
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[11px] font-bold",
                      readiness.ready
                        ? "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                        : "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                    )}
                  >
                    {readiness.ready ? "Granted" : "Missing"}
                  </span>
                </div>
              )}

              {!readiness.ready &&
                readiness.code !== "account_changed" &&
                readiness.code !== "account_unbound" && (
                <Link
                  href={
                    providerStatus?.configuration === "ready"
                      ? providerStatus.connectUrl
                      : "/settings?tab=integrations"
                  }
                  className="mt-2 inline-block font-semibold text-[var(--pf-danger)]"
                >
                  {providerStatus?.configuration === "ready"
                    ? `Connect ${providerStatus.displayName}`
                    : "Open integrations"} →
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </fieldset>
  );
}
