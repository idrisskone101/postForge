import { ChevronLeft, ChevronRight, DollarSign, Search } from "lucide-react";
import { WorkspaceState } from "@/components/workspace-state";
import { COST_LOG_PAGE_SIZE } from "@/lib/costs/spend-period";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import type { SpendGenerationLogProps } from "./types";

export function SpendGenerationLog({
  dashboard,
  view,
  handlers,
}: SpendGenerationLogProps) {
  return (
    <section
      data-spend-log="true"
      className="pf-card overflow-hidden"
    >
      <header className="flex flex-col gap-3 border-b border-[var(--pf-border)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="pf-section-title">Generation Log</h2>
          <span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[11px] text-[var(--pf-muted)]">
            {dashboard.logTotalCount} {dashboard.logTotalCount === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex h-9 min-w-0 items-center gap-2 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3 text-[var(--pf-muted)] sm:w-60">
            <Search className="size-3.5 shrink-0" />
            <span className="sr-only">Search cost log</span>
            <input
              type="search"
              value={dashboard.search}
              onChange={(event) => {
                handlers.onSearchChange(event.target.value);
              }}
              placeholder="Search generations"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--pf-ink)] outline-none placeholder:text-[var(--pf-muted)]"
            />
          </label>
          <select
            value={dashboard.model ?? "all"}
            onChange={(event) => {
              const next = event.target.value;
              handlers.onModelChange(next === "all" ? null : next);
            }}
            aria-label="Filter cost log by model"
            className="h-9 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3 text-[12px] text-[var(--pf-ink)] outline-none transition-colors duration-[180ms] focus:border-[var(--pf-border-strong)]"
          >
            <option value="all">All models</option>
            {view.modelOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="max-h-[430px] overflow-auto">
        {dashboard.logs.length === 0 ? (
          <WorkspaceState
            tone="empty"
            icon={DollarSign}
            title={view.emptyPeriod ? "No cost log entries yet" : "No matching cost log entries"}
            description={
              view.emptyPeriod
                ? "Create production work to populate Spend with cost entries."
                : "Try a different model filter or search term."
            }
            action={
              view.emptyPeriod
                ? { href: "/ugc-clone", label: "Start Clone" }
                : { label: "Clear filters", onClick: handlers.onClearFilters }
            }
            secondaryAction={
              view.emptyPeriod
                ? { href: "/generate", label: "Open Generate" }
                : undefined
            }
            className="min-h-56 border-0 bg-transparent"
          />
        ) : (
          <LogTable logs={dashboard.logs} />
        )}
      </div>

      {dashboard.logTotalCount > COST_LOG_PAGE_SIZE && (
        <footer className="flex items-center justify-between border-t border-[var(--pf-border)] bg-[var(--pf-active)] px-4 py-3">
          <span className="text-[11px] text-[var(--pf-muted)]">
            Page <strong className="text-[var(--pf-ink)]">{view.safeLogPage + 1}</strong> of {view.totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Previous cost log page"
              disabled={view.safeLogPage === 0}
              onClick={() => handlers.onLogPageChange(Math.max(0, view.safeLogPage - 1))}
              className="pf-button-secondary inline-flex size-8 items-center justify-center p-0 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next cost log page"
              disabled={!dashboard.logHasNext}
              onClick={() => handlers.onLogPageChange(view.safeLogPage + 1)}
              className="pf-button-secondary inline-flex size-8 items-center justify-center p-0 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}

function LogTable({
  logs,
}: {
  logs: SpendGenerationLogProps["dashboard"]["logs"];
}) {
  return (
    <div className="min-w-[700px]">
      <div className="hidden grid-cols-[minmax(0,1fr)_140px_88px_120px_88px] gap-3 border-b border-[var(--pf-border)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)] md:grid">
        <span>Generation</span>
        <span>Model</span>
        <span>Type</span>
        <span>Created</span>
        <span className="text-right">Cost</span>
      </div>
      <div className="divide-y divide-[var(--pf-border)]">
        {logs.map((log) => (
          <LogRow key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}

function LogRow({
  log,
}: {
  log: SpendGenerationLogProps["dashboard"]["logs"][number];
}) {
  return (
    <div className="grid gap-2 px-4 py-3 transition-colors duration-[180ms] hover:bg-[var(--pf-active)] md:grid-cols-[minmax(0,1fr)_140px_88px_120px_88px] md:items-center md:gap-3">
      <div className="min-w-0">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)] md:hidden">
          Generation
        </span>
        <strong className="pf-data block max-w-52 truncate text-[12px] font-semibold text-[var(--pf-ink)]">
          {log.jobId}
        </strong>
      </div>
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)] md:hidden">
          Model
        </span>
        <span className="text-[12px] font-medium text-[var(--pf-ink)]">{log.model}</span>
      </div>
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)] md:hidden">
          Type
        </span>
        <TypeChip type={log.type} />
      </div>
      <div suppressHydrationWarning>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)] md:hidden">
          Created
        </span>
        <span className="pf-data block text-[12px] text-[var(--pf-muted)]">
          {formatRelativeDate(log.createdAt)}
        </span>
      </div>
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)] md:hidden">
          Cost
        </span>
        <span className="pf-data block text-right text-[12px] font-semibold text-[var(--pf-ink)] md:text-right">
          {formatCost(log.amount)}
        </span>
      </div>
    </div>
  );
}

function TypeChip({ type }: { type: "image" | "video" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize",
        type === "image"
          ? "bg-[var(--pf-active)] text-[var(--pf-muted)]"
          : "border border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-ink)]"
      )}
    >
      {type}
    </span>
  );
}
