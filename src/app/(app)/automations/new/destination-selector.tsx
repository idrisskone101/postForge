"use client";

import Link from "next/link";
import { Button, Field, StatusChip, buttonClass } from "@/components/workbench";
import {
  AUTOMATION_SOCIAL_DESTINATIONS,
  automationDestinationLabel,
  integrationAccountLabel,
  resolveAutomationDestination,
  type AutomationDestination,
} from "@/lib/automations";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";

export type DestinationSelectorState = {
  destination: AutomationDestination;
  accountId: string | null;
  providers: readonly PublicIntegrationStatus[];
  loading: boolean;
  error: string | null;
  onSelect: (destination: AutomationDestination) => void;
  onAccountSelect: (accountId: string, accountLabel: string) => void;
  onRetry: () => void;
};

export function DestinationSelector({
  selector,
}: {
  selector: DestinationSelectorState;
}) {
  const {
    destination,
    accountId,
    providers,
    loading,
    error,
    onSelect,
    onAccountSelect,
    onRetry,
  } = selector;
  const readiness = resolveAutomationDestination(
    destination,
    providers,
    destination === "manual" ? undefined : accountId,
  );
  const providerStatus = readiness.providerStatus;
  const options: readonly {
    id: AutomationDestination;
    label: string;
  }[] = [
    { id: "manual", label: "Review queue" },
    ...AUTOMATION_SOCIAL_DESTINATIONS,
  ];

  function optionState(id: AutomationDestination) {
    if (id === "manual") return "local review";
    if (loading) return "checking";
    const optionReadiness = resolveAutomationDestination(id, providers);
    if (error || optionReadiness.code === "unavailable") return "unavailable";
    if (optionReadiness.ready) return "ready";
    if (optionReadiness.code === "missing_publish") return "scope missing";
    return optionReadiness.code === "not_configured"
      ? "not configured"
      : "disconnected";
  }

  return (
    <>
      <Field
        label="Destination"
        htmlFor="builder-destination"
        className="min-w-0"
      >
        <select
          id="builder-destination"
          className="wb-input"
          value={destination}
          onChange={(event) =>
            onSelect(event.target.value as AutomationDestination)
          }
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.id === destination
                ? option.label
                : `${option.label} (${optionState(option.id)})`}
            </option>
          ))}
        </select>
      </Field>

      {destination !== "manual" && (
        <div
          data-destination-state={
            loading
              ? "checking"
              : error
                ? "error"
                : readiness.ready
                  ? "ready"
                  : "blocked"
          }
          className="col-span-2 flex min-w-0 flex-col gap-2.5 rounded-lg bg-raised p-3.5"
        >
          {loading ? (
            <p className="text-[13px] leading-[18px] text-fg-secondary">
              Checking the live {automationDestinationLabel(destination)}{" "}
              connection
            </p>
          ) : error ? (
            <>
              <StatusChip tone="bad" icon="x" className="self-start">
                Connection check failed
              </StatusChip>
              <p className="min-w-0 break-words text-[13px] leading-[18px] text-fg-secondary [overflow-wrap:anywhere]">
                {error}. This destination will remain gated.
              </p>
              <Button size={32} className="self-start" onClick={onRetry}>
                Check again
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone={readiness.ready ? "ok" : "warn"}>
                  {readiness.ready
                    ? "Connection verified"
                    : "Connection required"}
                </StatusChip>
                {providerStatus && (
                  <StatusChip tone={readiness.ready ? "ok" : "bad"}>
                    {readiness.ready
                      ? "Upload capability granted"
                      : "Upload capability missing"}
                  </StatusChip>
                )}
              </div>
              <p className="min-w-0 break-words text-[13px] leading-[18px] text-fg-secondary [overflow-wrap:anywhere]">
                {readiness.message}
              </p>

              {providerStatus?.connected &&
                providerStatus.accounts.length > 0 && (
                  <Field
                    label="Connected account"
                    htmlFor="builder-destination-account"
                  >
                    <select
                      id="builder-destination-account"
                      value={accountId ?? ""}
                      onChange={(event) => {
                        const selected = providerStatus.accounts.find(
                          (candidate) =>
                            candidate.account.id === event.target.value,
                        );
                        onAccountSelect(
                          event.target.value,
                          selected
                            ? (integrationAccountLabel(selected.account) ??
                                "Connected account")
                            : "Connected account",
                        );
                      }}
                      className="wb-input bg-raised-strong"
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
                          {candidate.capabilities.publish
                            ? ""
                            : " (no upload scope)"}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

              {!readiness.ready &&
                readiness.code !== "account_changed" &&
                readiness.code !== "account_unbound" && (
                  providerStatus?.configuration === "ready" ? (
                    // A plain anchor: the connect route starts an OAuth handshake, and a Link would prefetch it.
                    <a
                      href={providerStatus.connectUrl}
                      className={`${buttonClass("strong", 32)} self-start`}
                    >
                      Connect {providerStatus.displayName}
                    </a>
                  ) : (
                    <Link
                      href="/settings?tab=integrations"
                      className={`${buttonClass("strong", 32)} self-start`}
                    >
                      Open integrations
                    </Link>
                  )
                )}
            </>
          )}
        </div>
      )}
    </>
  );
}
