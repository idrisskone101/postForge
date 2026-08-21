import { ChevronLeft, ChevronRight, DollarSign, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkspaceState } from "@/components/workspace-state";
import { COST_LOG_PAGE_SIZE } from "@/lib/costs/spend-period";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import type {
  CostsPageClientProps,
  SpendDashboardView,
  SpendPageHandlers,
} from "./spend-models";

type SpendGenerationLogProps = {
  dashboard: CostsPageClientProps;
  view: SpendDashboardView;
  handlers: SpendPageHandlers;
};

export function SpendGenerationLog({
  dashboard,
  view,
  handlers,
}: SpendGenerationLogProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--pf-shadow-2xs)]">
      <header className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Generation Log</h2>
          <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
            {dashboard.logTotalCount} {dashboard.logTotalCount === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-muted-foreground sm:w-60">
            <Search className="size-3.5 shrink-0" />
            <span className="sr-only">Search cost log</span>
            <input
              type="search"
              value={dashboard.search}
              onChange={(event) => {
                handlers.onSearchChange(event.target.value);
              }}
              placeholder="Search generations"
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <select
            value={dashboard.model ?? "all"}
            onChange={(event) => {
              const next = event.target.value;
              handlers.onModelChange(next === "all" ? null : next);
            }}
            aria-label="Filter cost log by model"
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Generation
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Model
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Type
              </TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Created
              </TableHead>
              <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Cost
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dashboard.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-2">
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
                </TableCell>
              </TableRow>
            ) : (
              dashboard.logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/40">
                  <TableCell>
                    <strong className="block max-w-52 truncate text-xs font-semibold">
                      {log.jobId}
                    </strong>
                  </TableCell>
                  <TableCell className="text-xs font-medium">{log.model}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize",
                        log.type === "image"
                          ? "bg-accent-blue/10 text-accent-blue"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {log.type}
                    </span>
                  </TableCell>
                  <TableCell
                    className="text-[11px] text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {formatRelativeDate(log.createdAt)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">
                    {formatCost(log.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {dashboard.logTotalCount > COST_LOG_PAGE_SIZE && (
        <footer className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
          <span className="text-[11px] text-muted-foreground">
            Page <strong className="text-foreground">{view.safeLogPage + 1}</strong> of {view.totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Previous cost log page"
              disabled={view.safeLogPage === 0}
              onClick={() => handlers.onLogPageChange(Math.max(0, view.safeLogPage - 1))}
              className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next cost log page"
              disabled={!dashboard.logHasNext}
              onClick={() => handlers.onLogPageChange(view.safeLogPage + 1)}
              className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}
