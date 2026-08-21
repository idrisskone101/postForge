"use client";

import {
  Check,
  CircleAlert,
  Inbox,
  Loader2,
} from "lucide-react";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import {
  automationDestinationLabel,
  isAutomationSocialDestination,
  resolveAutomationDestination,
  type AutomationDestinationReadiness,
  type AutomationRecord,
} from "@/lib/automations";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";

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
      <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
          <Inbox className="size-3.5" />
        </span>
        <span className="min-w-0">
          <b className="block truncate text-[11px]">Review queue</b>
          <small className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            No external account
          </small>
        </span>
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
    <div className="flex min-w-0 items-start gap-2 text-[11px] text-muted-foreground">
      <SocialProviderIcon
        provider={record.destination}
        label={providerName}
        youtubeVariant="shorts"
        className="size-7 shrink-0"
      />
      <span className="min-w-0">
        <b className="block truncate text-[11px]">{providerName}</b>
        <small className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {accountLabel ?? "No connected account"}
        </small>
        {loading ? (
          <small className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="size-2.5 animate-spin" /> Checking live connection
          </small>
        ) : readiness.ready ? (
          <small className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--pf-success)]">
            <Check className="size-2.5" /> Connection verified
          </small>
        ) : (
          <small
            className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--pf-danger)]"
            title={readiness.message}
          >
            <CircleAlert className="size-2.5 shrink-0" />{" "}
            {destinationWarningLabel(readiness.code)}
          </small>
        )}
      </span>
    </div>
  );
}
