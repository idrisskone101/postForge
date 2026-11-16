"use client";

import Link from "next/link";
import { BrowserLocalText } from "@/components/browser-local-text";
import { Button, buttonClass } from "@/components/workbench/button";
import { IconButton } from "@/components/workbench/icon-button";
import { Panel } from "@/components/workbench/panel";
import { StatusBadge } from "@/components/workbench/status-badge";
import { canAggregateConnectedProviders } from "@/lib/performance/metrics";
import { cn } from "@/lib/utils";
import { buildSourceRows } from "./performance-helpers";
import type { PerformanceSourceRow, PerformanceSourceWorkspace } from "./types";

export function PerformanceSourcePanel({
  workspace,
}: {
  workspace: PerformanceSourceWorkspace;
}) {
  const rows = buildSourceRows({
    statuses: workspace.statuses,
    accounts: workspace.providers,
    csvDataset: workspace.csvDataset,
    allowAllConnected: canAggregateConnectedProviders(workspace.providers),
  });
  return (
    <Panel
      pad="none"
      className="w-[372px] shrink-0 gap-0 p-5 max-lg:w-full"
      aria-labelledby="performance-sources-title"
    >
      <div className="flex min-h-7 items-center gap-3 pb-2">
        <h2 id="performance-sources-title" className="wb-panel-title flex-1">
          Sources
        </h2>
        {workspace.syncAll ? (
          <Button
            size={32}
            onClick={workspace.syncAll}
            disabled={workspace.busyProvider !== null}
          >
            Sync all
          </Button>
        ) : null}
      </div>
      <ul className="flex flex-col">
        {rows.map((row) => (
          <SourceRow key={row.key} row={row} workspace={workspace} />
        ))}
      </ul>
    </Panel>
  );
}

function SourceRow({
  row,
  workspace,
}: {
  row: PerformanceSourceRow;
  workspace: PerformanceSourceWorkspace;
}) {
  const selectable =
    workspace.selectable &&
    (row.kind === "account" || row.kind === "all-connected" || row.kind === "csv");
  const selected = selectable && workspace.selectedSource === row.key;
  const sub = "sub" in row ? row.sub : null;
  const text = (
    <>
      <span className="flex items-center gap-2 text-[14px] font-semibold leading-[19px] text-fg">
        {selected ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-ember" /> : null}
        <span className="truncate">{row.name}</span>
      </span>
      {sub ? (
        <BrowserLocalText className="max-w-full text-[12px] leading-4 text-fg-muted [overflow-wrap:anywhere]">
          {sub}
        </BrowserLocalText>
      ) : null}
    </>
  );
  return (
    <li
      className={cn(
        "flex min-h-[50px] items-center gap-2 border-b border-hairline py-1.5 transition-[background-color] duration-[var(--pf-dur-state)] ease-pf last:border-b-0",
        workspace.selectable && "-mx-2.5 px-2.5",
        selected && "rounded-lg border-transparent bg-raised",
      )}
    >
      {selectable ? (
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => workspace.onSelect(row.key)}
          className="flex min-w-0 flex-1 flex-col items-start rounded-md text-left"
        >
          {text}
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col">{text}</span>
      )}
      <RowTrailing row={row} workspace={workspace} />
    </li>
  );
}

function RowTrailing({
  row,
  workspace,
}: {
  row: PerformanceSourceRow;
  workspace: PerformanceSourceWorkspace;
}) {
  switch (row.kind) {
    case "unconfigured":
      return <span className={cn(CHIP, "bg-raised text-fg-secondary")}>Not configured</span>;
    case "disconnected":
      return (
        <Link href={INTEGRATIONS_HREF} className={cn(buttonClass("quiet", 32), SMALL_PILL)}>
          Connect
        </Link>
      );
    case "unavailable":
      return <span className={cn(CHIP, "bg-bad-tint text-bad")}>Status unavailable</span>;
    case "all-connected":
      return null;
    case "account":
      return <AccountTrailing row={row} workspace={workspace} />;
    case "csv":
      return (
        <span className="flex shrink-0 gap-1.5">
          <Button size={32} className={SMALL_PILL} onClick={workspace.onImport} disabled={workspace.importing}>
            {workspace.importing ? "Importing" : "Replace"}
          </Button>
          <Button size={32} variant="danger" className={SMALL_PILL} onClick={workspace.onClearCsv}>
            Remove
          </Button>
        </span>
      );
    case "csv-missing":
      return (
        <Button size={32} className={SMALL_PILL} onClick={workspace.onImport} disabled={workspace.importing}>
          {workspace.importing ? "Importing" : "Import"}
        </Button>
      );
  }
}

function AccountTrailing({
  row,
  workspace,
}: {
  row: Extract<PerformanceSourceRow, { kind: "account" }>;
  workspace: PerformanceSourceWorkspace;
}) {
  if (row.health === "reconnect") {
    return (
      <Link
        href={INTEGRATIONS_HREF}
        aria-label={`Reconnect ${row.name} in Settings`}
        className={cn(CHIP, "bg-warn-tint text-warn transition-opacity duration-[var(--pf-dur-feedback)] hover:opacity-85")}
      >
        Reconnect required
      </Link>
    );
  }
  const chip = workspace.busyProvider === row.entry.provider ? HEALTH_CHIPS.syncing : HEALTH_CHIPS[row.health];
  return (
    <>
      {chip ? <span className={cn(CHIP, chip.className)}>{chip.label}</span> : <StatusBadge tone="ok" label="Synced" className="[&>svg]:size-3.5" />}
      <IconButton
        icon="refresh"
        label={`Sync ${row.name} ${row.sub.split(" - ")[0]}`}
        variant="ghost"
        size={28}
        disabled={workspace.busyProvider !== null}
        onClick={() => workspace.onSync(row.entry)}
      />
    </>
  );
}

const INTEGRATIONS_HREF = "/settings?tab=integrations";
const SMALL_PILL = "h-7 px-3 text-[12px] leading-4";
const CHIP =
  "inline-flex h-6 shrink-0 items-center whitespace-pre rounded-[var(--pf-radius-pill)] px-2.5 text-[12px] font-semibold leading-4";

const HEALTH_CHIPS: Record<"syncing" | "failed" | "partial" | "never" | "synced", { label: string; className: string } | null> = {
  syncing: { label: "Syncing", className: "bg-raised text-fg-secondary" },
  failed: { label: "Sync failed", className: "bg-bad-tint text-bad" },
  partial: { label: "Partial metrics", className: "bg-warn-tint text-warn" },
  never: { label: "Not synced", className: "bg-raised text-fg-secondary" },
  synced: null,
};
