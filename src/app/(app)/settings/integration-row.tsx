import type { ReactNode } from "react";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import { StatusChip } from "@/components/workbench";
import type { SocialProvider } from "@/lib/integrations-client";
import { cn } from "@/lib/utils";
import type { Cell, Chip, Notice } from "./integration-row-model";

export type IntegrationRowView = {
  tile: { provider: SocialProvider; label: string; dashed: boolean } | { glyph: ReactNode };
  name: string;
  sub?: string;
  chip: Chip | null;
  metrics: Cell | null;
  publishing: Cell | null;
  action?: ReactNode;
};

/**
 * One integration row. A table row from 720px of row width (tile, platform,
 * connection 168, metrics 150, publishing 170, action 112), a stacked card
 * below it. Notices and the detail region go in `children`.
 */
export function IntegrationRow({ view, children }: { view: IntegrationRowView; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-hairline py-[22px]">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-3 @min-[720px]:flex @min-[720px]:gap-3.5">
        <RowTile tile={view.tile} />
        <div className="flex min-w-0 flex-col justify-center gap-0.5 @max-[270px]:min-h-[52px] @min-[720px]:flex-1">
          <span className="text-sm font-semibold leading-[18px] text-fg">{view.name}</span>
          {view.sub && <span className="text-balance break-words text-[13px] leading-4 text-fg-muted">{view.sub}</span>}
          {!view.sub && view.chip === null && (
            <span aria-hidden="true" className="wb-skeleton my-0.5 h-3 w-28 rounded-full" />
          )}
        </div>
        <div className="col-start-3 row-start-1 flex @min-[720px]:w-[168px] @min-[720px]:shrink-0">
          {view.chip ? (
            <StatusChip tone={view.chip.tone} icon={view.chip.icon}>
              {view.chip.label}
            </StatusChip>
          ) : (
            <span aria-hidden="true" className="wb-skeleton h-6 w-24 rounded-full" />
          )}
        </div>
        <div className="col-span-2 col-start-2 grid grid-cols-2 gap-3 @min-[720px]:contents">
          <RowCell label="Metrics" cell={view.metrics} className="@min-[720px]:w-[150px]" />
          <RowCell label="Publishing" cell={view.publishing} className="@min-[720px]:w-[170px]" />
        </div>
        <div className="col-span-3 flex justify-end empty:hidden @min-[720px]:w-28 @min-[720px]:shrink-0 [&>*]:@max-[720px]:h-11 [&>*]:@max-[720px]:w-full">
          {view.action}
        </div>
      </div>
      {children}
    </div>
  );
}

export function RowNotice({ notice, children }: { notice: Notice; children?: ReactNode }) {
  return (
    <p
      className="wb-notice min-w-0 break-words py-[3px] pr-1.5 [overflow-wrap:anywhere]"
      data-tone={notice.tone}
      role={notice.tone === "bad" ? "alert" : undefined}
    >
      <span className="min-w-0 flex-1 py-1">
        <strong className={cn("font-semibold", notice.tone === "bad" ? "text-bad" : "text-warn")}>{notice.lead}</strong>{" "}
        {notice.text}
      </span>
      {children}
    </p>
  );
}

function RowTile({ tile }: { tile: IntegrationRowView["tile"] }) {
  if ("glyph" in tile) {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-dashed border-edge text-fg-muted">
        {tile.glyph}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg",
        tile.dashed ? "border-[1.5px] border-dashed border-edge" : "bg-raised"
      )}
    >
      <SocialProviderIcon
        provider={tile.provider}
        label={tile.label}
        className="size-[22px]"
      />
    </span>
  );
}

const CELL_TONE: Record<Cell["tone"], string> = {
  fg: "text-fg",
  warn: "text-warn",
  bad: "text-bad",
  muted: "text-fg-muted",
};

function RowCell({ label, cell, className }: { label: string; cell: Cell | null; className: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5 @min-[720px]:shrink-0", className)}>
      <span className="wb-label @min-[720px]:sr-only">{label}</span>
      {cell ? (
        <>
          <span className={cn("text-sm font-medium leading-[18px]", CELL_TONE[cell.tone])}>{cell.text}</span>
          {cell.sub && <span className="text-balance text-[13px] leading-4 text-fg-muted">{cell.sub}</span>}
        </>
      ) : (
        <span aria-hidden="true" className="wb-skeleton mt-1 h-3 w-20 rounded-full" />
      )}
    </div>
  );
}
