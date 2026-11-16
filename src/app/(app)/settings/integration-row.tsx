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
 * One integration row. A table row from 841px of row width, a stacked card below it. The 1440 board
 * draws the row 852px wide (tile, platform, connection 168, metrics 150, publishing 170, action
 * 112); an always-on scrollbar takes 11px of that, and the table has to hold there too.
 *
 * The fixed columns and gaps take 714px. The platform column keeps 153px, one line of its longest
 * sub line ("Server credentials missing"). The room for it comes first from the action column, which
 * gives up to 15px, and then from the connection column, which gives up to 11px: its widest chip
 * ("Reconnect required") is 150px, so 157px still holds it.
 * Notices and the detail region go in `children`.
 */
export function IntegrationRow({ view, children }: { view: IntegrationRowView; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-hairline py-[22px]">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-3 @min-[841px]:flex @min-[841px]:gap-3.5">
        <RowTile tile={view.tile} className={view.sub ? "@max-[841px]:row-span-2" : undefined} />
        <div
          className={cn(
            "flex min-w-0 flex-col justify-center gap-0.5 @min-[841px]:min-w-[153px] @min-[841px]:flex-1",
            view.sub && "@max-[841px]:contents"
          )}
        >
          <span className="text-sm font-semibold leading-[18px] text-fg @max-[841px]:col-start-2 @max-[841px]:row-start-1">
            {view.name}
          </span>
          {view.sub && <span className={SUB_CLASS}>{view.sub}</span>}
          {!view.sub && view.chip === null && (
            <span aria-hidden="true" className="wb-skeleton my-0.5 h-3 w-28 rounded-full" />
          )}
        </div>
        <div className="col-start-3 row-start-1 flex @min-[841px]:w-[168px] @min-[841px]:min-w-[157px]">
          {view.chip ? (
            <StatusChip tone={view.chip.tone} icon={view.chip.icon}>
              {view.chip.label}
            </StatusChip>
          ) : (
            <span aria-hidden="true" className="wb-skeleton h-6 w-24 rounded-full" />
          )}
        </div>
        <div className="col-span-2 col-start-2 grid grid-cols-2 gap-3 @min-[841px]:contents">
          <RowCell label="Metrics" cell={view.metrics} className="@min-[841px]:w-[150px]" />
          <RowCell label="Publishing" cell={view.publishing} className="@min-[841px]:w-[170px]" />
        </div>
        <div className="col-span-3 flex justify-end empty:hidden @min-[841px]:w-28 @min-[841px]:min-w-[97px] @min-[841px]:shrink-[1000] [&>*]:@max-[841px]:h-11 [&>*]:@max-[841px]:w-full">
          {view.action}
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * A notice under a row. Alone it is the 38px notice (10px 14px). With a trailing 32px action it is
 * 44px (6px 6px 6px 14px), and its text keeps 4px more so a wrapped notice still has 10px around it.
 */
export function RowNotice({ notice, children }: { notice: Notice; children?: ReactNode }) {
  const hasAction = Boolean(children);
  return (
    <p
      className={cn("wb-notice min-w-0 break-words [overflow-wrap:anywhere]", hasAction && "py-1.5 pr-1.5")}
      data-tone={notice.tone}
      role={notice.tone === "bad" ? "alert" : undefined}
    >
      <span className={cn("min-w-0 flex-1", hasAction && "py-1")}>
        <strong className={cn("font-semibold", notice.tone === "bad" ? "text-bad" : "text-warn")}>{notice.lead}</strong>{" "}
        {notice.text}
      </span>
      {children}
    </p>
  );
}

/*
 * In the stacked card the sub line has its own grid row across the name and chip columns, so it
 * reads on one line beside nothing narrower than the card. The negative margin trades the 12px row
 * gap for the 2px that separates it from the name in the table row.
 */
const SUB_CLASS = [
  "text-balance break-words text-[13px] leading-4 text-fg-muted",
  "@max-[841px]:col-span-2 @max-[841px]:col-start-2 @max-[841px]:row-start-2 @max-[841px]:-mt-2.5",
].join(" ");

function RowTile({ tile, className }: { tile: IntegrationRowView["tile"]; className?: string }) {
  if ("glyph" in tile) {
    return (
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-dashed border-edge text-fg-muted",
          className
        )}
      >
        {tile.glyph}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg",
        tile.dashed ? "border-[1.5px] border-dashed border-edge" : "bg-raised",
        className
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
    <div className={cn("flex min-w-0 flex-col gap-0.5 @min-[841px]:shrink-0", className)}>
      <span className="wb-label @min-[841px]:sr-only">{label}</span>
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
