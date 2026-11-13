"use client";

import { Button, StatusChip } from "@/components/workbench";
import type { useIdentityPack } from "./use-identity-pack";

type IdentityPackView = ReturnType<typeof useIdentityPack>;

export function CharacterIdentityPackRow({ identity }: { identity: IdentityPackView }) {
  return (
    <div className="flex h-[34px] shrink-0 items-center justify-between gap-3 border-t border-hairline">
      <dt className="text-xs font-semibold leading-4 text-fg-muted">Identity pack</dt>
      <dd className="flex min-w-0 justify-end" aria-live="polite">
        <IdentityPackChip identity={identity} />
      </dd>
    </div>
  );
}

export function CharacterIdentityPackNotice({ identity }: { identity: IdentityPackView }) {
  const failed = identity.pack?.status === "failed";
  if (!failed && !identity.error) return null;
  const reason = identity.error ?? identity.pack?.error ?? "No reason was recorded.";
  return (
    <div className="wb-notice wb-fade-in flex-col items-start gap-2.5" data-tone="bad" role="alert">
      <p className="text-[13px] leading-[19px] text-fg [overflow-wrap:anywhere]">
        <strong className="font-bold text-bad">{failed ? "Identity prep failed." : "Identity pack unavailable."}</strong> {reason}
        {failed ? " The saved portrait still works in Clone." : null}
      </p>
      {failed ? (
        <Button size={32} onClick={() => void identity.retry()} disabled={identity.retrying}>
          {identity.retrying ? "Retrying" : "Retry identity prep"}
        </Button>
      ) : null}
    </div>
  );
}

function IdentityPackChip({ identity }: { identity: IdentityPackView }) {
  const { pack, loaded, preparing, retrying } = identity;
  if (!loaded && !retrying) return <span className="text-sm font-medium text-fg-muted">Checking</span>;
  if (preparing || retrying) {
    return (
      <StatusChip tone="live">
        <span className="wb-live-dot" />
        Preparing
      </StatusChip>
    );
  }
  if (pack?.status === "failed") return <StatusChip tone="bad" icon="x">Failed</StatusChip>;
  if (pack?.status === "completed") {
    const count = pack.images.length;
    return (
      <StatusChip tone="ok" icon="check">
        {count} {count === 1 ? "reference" : "references"}
      </StatusChip>
    );
  }
  if (identity.error) return <span className="text-sm font-medium text-fg-muted">-</span>;
  return <span className="text-sm font-medium text-fg-muted">Not prepared</span>;
}
