"use client";

import { useId, useState, type ReactNode } from "react";
import { Button, Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";
import { IntegrationRow, RowNotice } from "./integration-row";
import {
  accountChip,
  accountLabel,
  accountNotices,
  formatConnectionDate,
  metricsCell,
  needsReauthorization,
  publishingCell,
} from "./integration-row-model";
import type { AccountRowModel } from "./types";

export function AccountRow({ row }: { row: AccountRowModel }) {
  const { providerStatus, account, busy } = row;
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const reauth = needsReauthorization(account);
  const { name, handle } = accountLabel(account, providerStatus.displayName);
  const notices = accountNotices(account);
  const toggle = () => setOpen((current) => !current);

  return (
    <IntegrationRow
      view={{
        tile: {
          provider: providerStatus.provider,
          label: `${providerStatus.displayName} logo`,
          dashed: false,
        },
        name: providerStatus.displayName,
        sub: account.account.username ? handle : name,
        chip: accountChip(account),
        metrics: metricsCell(account),
        publishing: publishingCell(account),
        action: reauth ? (
          <Button
            variant={row.primaryReconnect ? "primary" : "strong"}
            disabled={busy || !row.canStartOAuth}
            onClick={row.onReconnect}
          >
            Reconnect
          </Button>
        ) : (
          <ManageButton open={open} controls={detailId} onToggle={toggle} />
        ),
      }}
    >
      {notices.map((notice, index) => (
        <RowNotice key={notice.lead} notice={notice}>
          {reauth && index === 0 && (
            <Button variant="link" size={32} aria-expanded={open} aria-controls={detailId} onClick={toggle}>
              Manage
            </Button>
          )}
        </RowNotice>
      ))}
      <div id={detailId} hidden={!open} className="wb-fade-in rounded-lg bg-raised px-4 py-3.5">
        <div className="flex flex-col gap-4 @min-[720px]:flex-row @min-[720px]:items-center @min-[720px]:gap-6">
          <dl className="grid flex-1 grid-cols-2 gap-x-7 gap-y-3 @min-[560px]:flex @min-[560px]:flex-wrap">
            <Fact label="Account">{name}</Fact>
            <Fact label="Connected" mono>{formatConnectionDate(account.connectedAt)}</Fact>
            <Fact label="Last successful sync" mono>
              {account.sync.lastSuccessfulAt ? (
                <time dateTime={account.sync.lastSuccessfulAt}>
                  {formatConnectionDate(account.sync.lastSuccessfulAt)}
                </time>
              ) : (
                "Never"
              )}
            </Fact>
            {account.account.profileUrl && (
              <Fact label="Profile">
                <a
                  href={account.account.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${providerStatus.displayName} profile`}
                  className="rounded-sm font-semibold text-fg underline decoration-1 underline-offset-2"
                >
                  Open profile
                </a>
              </Fact>
            )}
          </dl>
          <div className="flex flex-wrap gap-2">
            {!reauth && (
              <Button
                variant="strong"
                disabled={busy}
                onClick={() => row.onSync(providerStatus, account.account.id)}
              >
                {busy ? "Syncing" : "Sync"}
              </Button>
            )}
            {row.canConnectAnother && (
              <Button
                className="bg-panel"
                disabled={busy || !row.canStartOAuth}
                title={`Connect another ${providerStatus.displayName} account`}
                onClick={row.onConnectAnother}
              >
                Connect another
              </Button>
            )}
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => row.onDisconnect(providerStatus, account.account.id)}
            >
              Disconnect
            </Button>
          </div>
        </div>
      </div>
    </IntegrationRow>
  );
}

function ManageButton({
  open,
  controls,
  onToggle,
}: {
  open: boolean;
  controls: string;
  onToggle: () => void;
}) {
  return (
    <Button aria-expanded={open} aria-controls={controls} onClick={onToggle} className="pr-3">
      Manage
      <Icon
        name="chevron-down"
        size={14}
        className={cn(
          "text-fg-secondary transition-transform duration-[var(--pf-dur-state)] ease-pf",
          open && "rotate-180"
        )}
      />
    </Button>
  );
}

function Fact({
  label,
  mono = false,
  children,
}: {
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="wb-label">{label}</dt>
      <dd className={cn("m-0 min-w-0 break-words text-[13px] leading-4 text-fg", mono && "wb-mono text-fg")}>
        {children}
      </dd>
    </div>
  );
}
