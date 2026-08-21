"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  Gauge,
  Search,
  Settings2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { PIE_COLORS } from "@/components/cost-chart";
import { WorkspaceState } from "@/components/workspace-state";
import {
  COST_LOG_PAGE_SIZE,
  SPEND_PERIODS,
  costsHref,
  type SpendPeriod,
} from "@/lib/costs/spend-period";

const CostChart = dynamic(
  () => import("@/components/cost-chart").then((module) => module.CostChart),
  { ssr: false }
);

const ModelPieChart = dynamic(
  () => import("@/components/cost-chart").then((module) => module.ModelPieChart),
  { ssr: false }
);

interface LogEntry {
  id: string;
  jobId: string;
  model: string;
  type: string;
  amount: number;
  createdAt: string;
}

interface CostsPageClientProps {
  totalCost: number;
  currentPeriodCost: number;
  changePercent: number;
  avgCycleCost: number;
  totalJobs: number;
  topModel: { name: string; cost: number; pct: string } | null;
  chartData: Array<{ date: string; image: number; video: number }>;
  byModel: Record<string, { count: number; cost: number }>;
  breakdown: {
    image: { count: number; cost: number };
    video: { count: number; cost: number };
  };
  logs: LogEntry[];
  logPage: number;
  logTotalCount: number;
  logHasNext: boolean;
  logFilterActive: boolean;
  search: string;
  model: string | null;
  period: SpendPeriod;
}

const PERIOD_OPTIONS = SPEND_PERIODS;
const BUDGET_STORAGE_KEY = "postforge-production-budget";

interface SpendPageContentProps extends CostsPageClientProps {
  onPeriodChange: (period: SpendPeriod) => void;
  onLogPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onModelChange: (model: string | null) => void;
  onClearFilters: () => void;
  onExportCsv: () => Promise<number>;
}

export function CostsPageClient({
  period,
  logPage,
  search,
  model,
  ...props
}: CostsPageClientProps) {
  const router = useRouter();
  const [queryDraft, setQueryDraft] = useState(search);

  useEffect(() => {
    setQueryDraft(search);
  }, [search]);

  useEffect(() => {
    if (queryDraft.trim() === search.trim()) return;
    const timeout = window.setTimeout(() => {
      router.push(
        costsHref({ period, logPage: 0, search: queryDraft, model })
      );
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [queryDraft, search, period, model, router]);

  const exportCsv = async (): Promise<number> => {
    const response = await fetch(`/api/costs/export?period=${period}`);
    if (!response.ok) {
      throw new Error("Failed to export cost logs");
    }
    const rowCount = Number(response.headers.get("X-Row-Count") ?? "0");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `postforge-spend-${period}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    return Number.isFinite(rowCount) ? rowCount : 0;
  };

  return (
    <SpendPageContent
      {...props}
      period={period}
      logPage={logPage}
      search={queryDraft}
      model={model}
      onPeriodChange={(value) => {
        router.push(
          costsHref({ period: value, logPage: 0, search: queryDraft, model })
        );
      }}
      onLogPageChange={(nextPage) => {
        router.push(costsHref({ period, logPage: nextPage, search, model }));
      }}
      onSearchChange={setQueryDraft}
      onModelChange={(nextModel) => {
        router.push(
          costsHref({
            period,
            logPage: 0,
            search: queryDraft,
            model: nextModel,
          })
        );
      }}
      onClearFilters={() => {
        setQueryDraft("");
        router.push(costsHref({ period, logPage: 0 }));
      }}
      onExportCsv={exportCsv}
    />
  );
}

export function SpendPageContent({
  totalCost,
  currentPeriodCost,
  changePercent,
  avgCycleCost,
  totalJobs,
  topModel,
  chartData,
  byModel,
  breakdown,
  logs,
  logPage,
  logTotalCount,
  logHasNext,
  logFilterActive,
  search,
  model,
  period,
  onPeriodChange,
  onLogPageChange,
  onSearchChange,
  onModelChange,
  onClearFilters,
  onExportCsv,
}: SpendPageContentProps) {
  const [budget, setBudget] = useState(250);
  const [budgetInput, setBudgetInput] = useState("250");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(BUDGET_STORAGE_KEY);
        const parsed = stored ? Number(stored) : Number.NaN;
        if (Number.isFinite(parsed) && parsed > 0) {
          setBudget(parsed);
          setBudgetInput(String(parsed));
        }
      } catch {
        // Local budget preferences are optional; the spend dashboard still works.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const modelEntries = useMemo(
    () => Object.entries(byModel).sort((a, b) => b[1].cost - a[1].cost),
    [byModel]
  );

  const totalModelCost = modelEntries.reduce((sum, [, data]) => sum + data.cost, 0);
  const modelNames = modelEntries.map(([name]) => name);
  const modelOptions =
    model && !modelNames.includes(model) ? [model, ...modelNames] : modelNames;

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const count = await onExportCsv();
      setFeedback(
        `Exported ${count} cost log ${count === 1 ? "entry" : "entries"}.`
      );
    } catch {
      return;
    } finally {
      setExporting(false);
    }
  };

  const saveBudget = () => {
    const nextBudget = Number(budgetInput);
    if (!Number.isFinite(nextBudget) || nextBudget <= 0) return;
    setBudget(nextBudget);
    try {
      window.localStorage.setItem(BUDGET_STORAGE_KEY, String(nextBudget));
    } catch {
      // Keep the in-session preference even if storage is unavailable.
    }
    setBudgetOpen(false);
    setFeedback(`Production budget updated to ${formatCost(nextBudget)}.`);
  };

  const totalPages = Math.max(1, Math.ceil(logTotalCount / COST_LOG_PAGE_SIZE));
  const safeLogPage = Math.min(logPage, totalPages - 1);
  const emptyPeriod = logTotalCount === 0 && !logFilterActive;
  const formatTotal = breakdown.image.cost + breakdown.video.cost;
  const imagePct = formatTotal > 0 ? (breakdown.image.cost / formatTotal) * 100 : 0;
  const videoPct = formatTotal > 0 ? (breakdown.video.cost / formatTotal) * 100 : 0;
  const workflowPieData = [
    { name: "Image", value: breakdown.image.cost },
    { name: "Video", value: breakdown.video.cost },
  ].filter((entry) => entry.value > 0);
  const budgetPercent = budget > 0 ? Math.min(100, (currentPeriodCost / budget) * 100) : 0;
  const budgetRemaining = Math.max(0, budget - currentPeriodCost);
  const changeIsUp = changePercent > 0;

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 p-5 sm:p-6 lg:p-8">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)] lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Spend controls
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cost tracking, budget signals, and model usage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center rounded-lg border border-border bg-background p-1 text-[11px] font-semibold"
            aria-label="Spend period"
          >
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={period === option}
                onClick={() => {
                  onPeriodChange(option);
                }}
                className={cn(
                  "h-8 rounded-md px-3 transition-colors",
                  period === option
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => {
                    void exportCsv();
                  }}
                  disabled={exporting}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                />
              }
            >
              <Download className="size-4" />
              <span>Export CSV</span>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
        </div>
      </section>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="flex min-w-0 items-start gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-green" />
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{feedback}</span>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Period Spend</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
                changePercent === 0 && "bg-muted text-muted-foreground",
                changeIsUp && "bg-destructive/10 text-destructive",
                changePercent < 0 && "bg-accent-green/10 text-accent-green"
              )}
            >
              {changePercent === 0 ? (
                "No change"
              ) : changeIsUp ? (
                <><TrendingUp className="size-3" /> {Math.abs(changePercent).toFixed(0)}%</>
              ) : (
                <><TrendingDown className="size-3" /> {Math.abs(changePercent).toFixed(0)}%</>
              )}
            </span>
          </div>
          <strong className="mt-3 block text-[28px] font-semibold tracking-[-0.02em] tabular-nums">
            {formatCost(currentPeriodCost)}
          </strong>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatCost(totalCost)} all-time spend
          </p>
        </article>

        <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Generations</span>
            <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Sparkles className="size-3.5" />
            </span>
          </div>
          <strong className="mt-3 block text-[28px] font-semibold tracking-[-0.02em] tabular-nums">
            {totalJobs}
          </strong>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Avg cost {formatCost(avgCycleCost)} per generation
          </p>
        </article>

        <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Top Model</span>
            <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Gauge className="size-3.5" />
            </span>
          </div>
          <strong className="mt-3 block truncate text-[20px] font-semibold tracking-[-0.02em]">
            {topModel ? topModel.name : "No data yet"}
          </strong>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {topModel
              ? `${formatCost(topModel.cost)} · ${topModel.pct}% of ${period.toUpperCase()} spend`
              : "Model usage appears after your first generation"}
          </p>
        </article>

        <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)]">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Budget remaining</span>
            <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
              <WalletCards className="size-3.5" />
            </span>
          </div>
          <strong className="mt-3 block text-[28px] font-semibold tracking-[-0.02em] tabular-nums">
            {formatCost(budgetRemaining)}
          </strong>
          <p className="mt-1 text-[11px] text-muted-foreground">
            of {formatCost(budget)} production budget
          </p>
        </article>
      </section>

      <section
        className={cn(
          "flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center",
          budgetPercent >= 90
            ? "border-destructive/30 bg-destructive/5"
            : "border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10"
        )}
      >
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            budgetPercent >= 90
              ? "bg-destructive/10 text-destructive"
              : "bg-[var(--pf-lamp-amber)]/15 text-[var(--pf-lamp-amber)]"
          )}
        >
          <AlertTriangle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <strong className="text-sm">
            You&apos;ve used {budgetPercent.toFixed(0)}% of your production budget
          </strong>
          <p className="mt-1 text-xs text-muted-foreground">
            Track the selected period against a budget you control locally in PostForge.
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-3 lg:w-72">
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-black/10">
            <div
              className={cn(
                "h-full rounded-full",
                budgetPercent >= 90 ? "bg-destructive" : "bg-[var(--pf-lamp-amber)]"
              )}
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
            {formatCost(currentPeriodCost)} / {formatCost(budget)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setBudgetOpen(true)}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold transition-colors hover:bg-muted"
        >
          <Settings2 className="size-3.5" />
          Edit budget
        </button>
      </section>

      <section
        data-spend-analysis-grid="true"
        className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"
      >
        <article className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)] sm:p-5">
          <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Spend Over Time</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Daily image and video cost · {period.toUpperCase()}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-sm bg-accent-blue" />
                Image
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-sm bg-primary" />
                Video
              </span>
            </div>
          </header>
          <CostChart data={chartData} />
        </article>

        <aside className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)] sm:p-5">
          <header className="border-b border-border pb-3">
            <h2 className="text-sm font-semibold">Spend breakdown</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Workflow type and model mix · {period.toUpperCase()}
            </p>
          </header>

          {workflowPieData.length > 0 ? (
            <>
              <div className="pt-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Spend by Format
                </h3>
                <div className="mt-2 grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3">
                  <div className="size-28 shrink-0" aria-label="Workflow type spend distribution">
                    <ModelPieChart data={workflowPieData} />
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <span className="size-2 shrink-0 rounded-sm bg-accent-blue" />
                          <span className="truncate">Image</span>
                        </span>
                        <strong className="shrink-0 text-foreground">{imagePct.toFixed(0)}%</strong>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {formatCost(breakdown.image.cost)} · {breakdown.image.count} {breakdown.image.count === 1 ? "job" : "jobs"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <span className="size-2 shrink-0 rounded-sm bg-primary" />
                          <span className="truncate">Video</span>
                        </span>
                        <strong className="shrink-0 text-foreground">{videoPct.toFixed(0)}%</strong>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {formatCost(breakdown.video.cost)} · {breakdown.video.count} {breakdown.video.count === 1 ? "job" : "jobs"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Spend by Model
                  </h3>
                  <span className="text-[11px] text-muted-foreground">Highest first</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {modelEntries.slice(0, 5).map(([name, data], index) => (
                    <div
                      key={name}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/55 px-2.5 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-[11px] font-medium">
                        <span
                          className="inline-block size-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="truncate">{name}</span>
                      </span>
                      <span className="shrink-0 text-right text-[11px] text-muted-foreground">
                        <strong className="block font-mono text-[11px] text-foreground">
                          {formatCost(data.cost)}
                        </strong>
                        {totalModelCost > 0
                          ? ((data.cost / totalModelCost) * 100).toFixed(1)
                          : "0"}
                        %
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <WorkspaceState
              tone="empty"
              icon={DollarSign}
              title="No spend data yet"
              description="Workflow and model breakdowns appear after the first tracked production cost."
              action={{ href: "/ugc-clone", label: "Start Clone" }}
              secondaryAction={{ href: "/generate", label: "Open Generate" }}
              className="min-h-64 border-0 bg-transparent px-0 py-6"
            />
          )}
        </aside>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--pf-shadow-2xs)]">
        <header className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Generation Log</h2>
            <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
              {logTotalCount} {logTotalCount === 1 ? "entry" : "entries"}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-muted-foreground sm:w-60">
              <Search className="size-3.5 shrink-0" />
              <span className="sr-only">Search cost log</span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  onSearchChange(event.target.value);
                }}
                placeholder="Search generations"
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <select
              value={model ?? "all"}
              onChange={(event) => {
                const next = event.target.value;
                onModelChange(next === "all" ? null : next);
              }}
              aria-label="Filter cost log by model"
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="all">All models</option>
              {modelOptions.map((name) => (
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
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-2">
                    <WorkspaceState
                      tone="empty"
                      icon={DollarSign}
                      title={emptyPeriod ? "No cost log entries yet" : "No matching cost log entries"}
                      description={
                        emptyPeriod
                          ? "Create production work to populate Spend with cost entries."
                          : "Try a different model filter or search term."
                      }
                      action={
                        emptyPeriod
                          ? { href: "/ugc-clone", label: "Start Clone" }
                          : { label: "Clear filters", onClick: onClearFilters }
                      }
                      secondaryAction={
                        emptyPeriod
                          ? { href: "/generate", label: "Open Generate" }
                          : undefined
                      }
                      className="min-h-56 border-0 bg-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
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

        {logTotalCount > COST_LOG_PAGE_SIZE && (
          <footer className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
            <span className="text-[11px] text-muted-foreground">
              Page <strong className="text-foreground">{safeLogPage + 1}</strong> of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous cost log page"
                disabled={safeLogPage === 0}
                onClick={() => onLogPageChange(Math.max(0, safeLogPage - 1))}
                className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Next cost log page"
                disabled={!logHasNext}
                onClick={() => onLogPageChange(safeLogPage + 1)}
                className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </footer>
        )}
      </section>

      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit production budget</DialogTitle>
            <DialogDescription>
              This planning value is stored only in this browser and does not change provider limits.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2">
            <span className="text-xs font-semibold">Budget amount (USD)</span>
            <Input
              type="number"
              min="1"
              step="1"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
              className="h-10"
            />
          </label>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setBudgetOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!Number.isFinite(Number(budgetInput)) || Number(budgetInput) <= 0}
              onClick={saveBudget}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save budget
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
