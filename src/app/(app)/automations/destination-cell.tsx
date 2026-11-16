"use client";

import {
  automationDestinationLabel,
  isAutomationSocialDestination,
  resolveAutomationDestination,
  type AutomationDestinationReadiness,
  type AutomationRecord,
} from "@/lib/automations";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";

export function AutomationDestinationCell({
  record,
  providers,
  loading,
}: {
  record: AutomationRecord;
  providers: readonly PublicIntegrationStatus[];
  loading: boolean;
}) {
  if (!isAutomationSocialDestination(record.destination)) {
    return (
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-semibold leading-[18px] text-fg">
          Review queue
        </span>
        <span className="truncate text-[12px] leading-4 text-fg-muted">No external account</span>
      </div>
    );
  }

  const readiness = resolveAutomationDestination(
    record.destination,
    providers,
    record.accountId ?? null
  );
  const providerName =
    readiness.providerStatus?.displayName ??
    automationDestinationLabel(record.destination);
  const accountLabel = readiness.accountLabel ?? record.accountLabel;

  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-[13px] font-semibold leading-[18px] text-fg">
        {providerName}
      </span>
      {loading ? (
        <span className="truncate text-[12px] leading-4 text-fg-muted">Checking connection</span>
      ) : readiness.ready ? (
        <span className="truncate text-[12px] leading-4 text-fg-muted" title={accountLabel ?? undefined}>
          {record.approvalRequired ? "Approval required" : (accountLabel ?? "Connection verified")}
        </span>
      ) : (
        <span className="line-clamp-2 text-[12px] font-semibold leading-4 text-warn" title={readiness.message}>
          {destinationWarningLabel(readiness.code)}
        </span>
      )}
    </div>
  );
}

function destinationWarningLabel(
  code: AutomationDestinationReadiness["code"]
) {
  switch (code) {
    case "not_configured":
      return "Provider not configured";
    case "missing_publish":
      return "Upload scope missing";
    case "reauthorization_required":
      return "Reconnect required";
    case "account_unbound":
      return "Choose the connected account";
    case "account_changed":
      return "Connected account changed";
    case "disconnected":
      return "Account disconnected";
    case "unavailable":
    case "manual":
    case "ready":
      return "Connection status unavailable";
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}
