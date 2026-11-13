"use client";

import Link from "next/link";
import { BrowserLocalText } from "@/components/browser-local-text";
import { Button } from "@/components/workbench/button";
import { MediaImage } from "@/components/workbench/media-image";
import { Icon } from "@/components/workbench/icon";
import { IconButton } from "@/components/workbench/icon-button";
import { Panel } from "@/components/workbench/panel";
import { cn } from "@/lib/utils";
import { COST_LOG_PAGE_SIZE } from "@/lib/costs/spend-period";
import { formatCost } from "@/lib/utils/format-cost";
import { createdLabel, logRangeLabel, modelLabel, shortJobId, typeLabel } from "./spend-format";
import { SpendLogEmpty } from "./spend-log-empty";
import type { SpendGenerationLogProps, SpendLogRow } from "./types";

export function SpendGenerationLog({
  dashboard,
  view,
  handlers,
  exporter,
}: SpendGenerationLogProps) {
  const now = new Date();
  return (
    <Panel pad="none" className="min-w-0 gap-0 p-5 max-md:p-4" aria-labelledby="spend-log-title">
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <h2 id="spend-log-title" className="wb-panel-title min-w-max flex-1 whitespace-nowrap">
          Generation log
        </h2>
        <label className="wb-input-wrap w-[240px] rounded-[var(--pf-radius-pill)] px-3 [&>svg]:size-4 max-md:order-last max-md:w-auto max-md:min-w-[150px] max-md:flex-1" data-size="36">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={dashboard.search}
            onChange={(event) => handlers.onSearchChange(event.target.value)}
            placeholder="Search cost log"
            aria-label="Search cost log"
          />
        </label>
        <label className="relative inline-flex h-9 max-w-[220px] shrink-0 items-center gap-1.5 rounded-full bg-raised pl-3.5 pr-2.5 text-[13px] font-semibold leading-4 text-fg transition-[background-color,box-shadow] duration-[var(--pf-dur-feedback)] ease-pf focus-within:shadow-[0_0_0_2px_var(--pf-ember)] hover:bg-raised-strong max-md:order-last">
          <span className="truncate">{dashboard.model ? modelLabel(dashboard.model) : "All models"}</span>
          <Icon name="chevron-down" size={16} className="shrink-0 text-fg-muted" />
          <select
            value={dashboard.model ?? "all"}
            onChange={(event) => {
              const next = event.target.value;
              handlers.onModelChange(next === "all" ? null : next);
            }}
            aria-label="Filter cost log by model"
            className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
          >
            <option value="all">All models</option>
            {view.modelOptions.map((name) => (
              <option key={name} value={name}>
                {modelLabel(name)}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={exporter.run} disabled={exporter.busy} className="pl-3 pr-3.5 text-[13px]">
          <Icon name="download" size={16} />
          {exporter.busy ? "Exporting" : "Export CSV"}
        </Button>
      </div>

      {dashboard.logs.length === 0 ? (
        <SpendLogEmpty onClearFilters={handlers.onClearFilters} />
      ) : (
        <>
          <div className="wb-table-head max-lg:hidden" aria-hidden="true">
            <span className="min-w-0 flex-1">Generation</span>
            <span className="w-[170px] shrink-0">Model</span>
            <span className="w-[90px] shrink-0">Type</span>
            <span className="w-[120px] shrink-0">Created</span>
            <span className="w-16 shrink-0 text-right">Cost</span>
          </div>
          <ul className="flex min-w-0 flex-col">
            {dashboard.logs.map((log) => (
              <li key={log.id} className="min-w-0 border-b border-hairline last:border-b-0">
                <SpendLogRowLink log={log} now={now} />
              </li>
            ))}
          </ul>
        </>
      )}

      {dashboard.logTotalCount > COST_LOG_PAGE_SIZE ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-hairline pt-3">
          <span className="wb-mono text-fg-muted">
            {logRangeLabel(view.safeLogPage, COST_LOG_PAGE_SIZE, dashboard.logTotalCount)}
          </span>
          <span className="flex gap-1.5">
            <IconButton
              icon="chevron-left"
              label="Previous cost log page"
              size={34}
              disabled={view.safeLogPage === 0}
              onClick={() => handlers.onLogPageChange(Math.max(0, view.safeLogPage - 1))}
            />
            <IconButton
              icon="chevron-right"
              label="Next cost log page"
              size={34}
              disabled={!dashboard.logHasNext}
              onClick={() => handlers.onLogPageChange(view.safeLogPage + 1)}
            />
          </span>
        </div>
      ) : null}
    </Panel>
  );
}

function SpendLogRowLink({ log, now }: { log: SpendLogRow; now: Date }) {
  const cells = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span className="wb-thumb size-[34px]">
          {log.job?.thumbnailSrc ? (
            <MediaImage src={log.job.thumbnailSrc} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-2">
            {log.job ? (
              <span className="truncate text-[14px] font-semibold leading-5 text-fg">{log.job.title}</span>
            ) : null}
            <span className={log.job ? "wb-mono shrink-0 text-fg-muted" : "wb-mono truncate text-fg"} title={log.jobId}>
              {shortJobId(log.jobId)}
            </span>
          </span>
          <span className="truncate text-[12px] leading-4 text-fg-muted lg:hidden">
            {modelLabel(log.model)} - {typeLabel(log.type)}
            <BrowserLocalText>{` - ${createdLabel(log.createdAt, now)}`}</BrowserLocalText>
          </span>
        </span>
      </span>
      <span className="w-[170px] shrink-0 truncate text-[13px] leading-[18px] text-fg max-lg:hidden" title={log.model}>
        {modelLabel(log.model)}
      </span>
      <span className="w-[90px] shrink-0 text-[13px] leading-[18px] text-fg-secondary max-lg:hidden">
        {typeLabel(log.type)}
      </span>
      <BrowserLocalText className="wb-mono w-[120px] shrink-0 whitespace-nowrap text-fg-secondary max-lg:hidden">
        {createdLabel(log.createdAt, now)}
      </BrowserLocalText>
      <span className="wb-mono w-16 shrink-0 text-right text-fg">{formatCost(log.amount)}</span>
    </>
  );
  if (!log.job) return <div className={ROW}>{cells}</div>;
  return (
    <Link href={log.job.href} className={cn(ROW, "hover:bg-raised/60 focus-visible:shadow-[inset_0_0_0_2px_var(--pf-ember)] focus-visible:outline-none")}>
      {cells}
    </Link>
  );
}

const ROW =
  "wb-row min-h-[54px] transition-[background-color,box-shadow] duration-[var(--pf-dur-feedback)] ease-pf max-lg:gap-3 max-lg:px-0 max-lg:py-2.5 lg:h-[54px]";
