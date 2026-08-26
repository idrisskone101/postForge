"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SettingsPaintText } from "./settings-paint-text";
import { AccountRow } from "./social-account-row";
import type { SocialProviderContent } from "./social-provider-content";
import type { ConnectedAccountsModel } from "./types";

export function ConnectedAccounts({ accounts }: { accounts: ConnectedAccountsModel }) {
  const {
    status,
    displayName,
    busy,
    canStartOAuth,
    youtubePolicyConsent,
    onSync,
    onDisconnect,
    onConnect,
  } = accounts;
  return (
    <div className="mt-3 grid gap-2">
      {status.accounts.map((account) => (
        <AccountRow
          key={account.account.id}
          row={{
            providerStatus: status,
            displayName,
            account,
            busy,
            onSync,
            onDisconnect,
            onReconnect: () =>
              onConnect(
                {
                  ...status,
                  connected: false,
                  accounts: [],
                  accountCount: 0,
                },
                youtubePolicyConsent
              ),
            canStartOAuth,
          }}
        />
      ))}
    </div>
  );
}

export function DisconnectedCopy({
  paintReady,
  content,
  notConfigured,
  unavailable,
}: {
  paintReady: boolean;
  content: SocialProviderContent;
  notConfigured: boolean;
  unavailable: boolean;
}) {
  if (notConfigured) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-border bg-[var(--pf-surface)] p-2.5">
        <b className="block text-[12px] text-muted-foreground">Server setup required</b>
        <SettingsPaintText
          ready={paintReady}
          liveAs="p"
          liveClassName="mt-1 min-w-0 text-[11px] leading-4 text-muted-foreground"
          paint={
            <p
              data-settings-setup="true"
              data-settings-text={content.setup}
              className="mt-1 min-w-0"
            >
              <span className="sr-only">{content.setup}</span>
            </p>
          }
        >
          {content.setup}
        </SettingsPaintText>
        <Link
          href={content.documentation}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--pf-link)]"
        >
          Setup documentation <ExternalLink className="size-2.5" />
        </Link>
        {content.policyLinks && (
          <div className="mt-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1">
            {content.policyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-0 items-center gap-1 break-words text-[11px] font-semibold text-[var(--pf-link)] [overflow-wrap:anywhere]"
              >
                {link.label} <ExternalLink className="size-2.5 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (unavailable) {
    return (
      <p className="mt-3 min-w-0 break-words rounded-lg border border-dashed border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 p-2.5 text-[11px] leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere]">
        The integration service did not return this provider. Refresh status before attempting a connection.
      </p>
    );
  }
  return (
    <p className="mt-3 rounded-lg border border-dashed border-border bg-[var(--pf-surface)] p-2.5 text-[11px] leading-4 text-muted-foreground">
      OAuth is configured, but no account is connected to this workspace.
    </p>
  );
}
