"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
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
import { Download, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import { PIE_COLORS } from "@/components/cost-chart";
import { WorkspaceState } from "@/components/workspace-state";

const CostChart = dynamic(
  () => import("@/components/cost-chart").then((mod) => mod.CostChart),
  { ssr: false }
);

const ModelPieChart = dynamic(
  () => import("@/components/cost-chart").then((mod) => mod.ModelPieChart),
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
  period: string;
}

const LOGS_PAGE_SIZE = 10;
const PERIOD_OPTIONS = ["7d", "30d", "90d"] as const;

interface SpendPageContentProps extends CostsPageClientProps {
  onPeriodChange: (period: string) => void;
}

export function CostsPageClient({
  period,
  ...props
}: CostsPageClientProps) {
  const router = useRouter();

  return (
    <SpendPageContent
      {...props}
      period={period}
      onPeriodChange={(value) => {
        if (value) router.push(`/costs?period=${value}`);
      }}
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
  period,
  onPeriodChange,
}: SpendPageContentProps) {
  const [logPage, setLogPage] = useState(0);

  const modelEntries = Object.entries(byModel).sort(
    (a, b) => b[1].cost - a[1].cost
  );

  const pieData = modelEntries.map(([name, data]) => ({
    name,
    value: Math.round(data.cost * 100) / 100,
  }));

  const totalModelCost = modelEntries.reduce((s, [, d]) => s + d.cost, 0);

  const exportCSV = () => {
    const header = "Date,Model,Type,Amount\n";
    const rows = logs
      .map((l) => `${l.createdAt},${l.model},${l.type},${l.amount}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `postforge-spend-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pagedLogs = logs.slice(
    logPage * LOGS_PAGE_SIZE,
    (logPage + 1) * LOGS_PAGE_SIZE
  );
  const totalPages = Math.ceil(logs.length / LOGS_PAGE_SIZE);
  const formatTotal = breakdown.image.cost + breakdown.video.cost;
  const imagePct = formatTotal > 0 ? (breakdown.image.cost / formatTotal) * 100 : 0;
  const videoPct = formatTotal > 0 ? (breakdown.video.cost / formatTotal) * 100 : 0;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-6 lg:p-8 animate-fade-in-up">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Spend controls
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cost tracking, budget signals, and model usage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-border bg-background/60 p-1 text-[11px] font-semibold tracking-wide">
            {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => onPeriodChange(p)}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-colors",
                    period === p
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {p.toUpperCase()}
                </button>
            ))}
          </div>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={exportCSV}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                />
              }
            >
              <Download className="size-4" />
              <span>Export CSV</span>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Period Spend
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold leading-tight">
              {formatCost(currentPeriodCost)}
            </span>
            {changePercent !== 0 && (
              <span
                className={cn(
                  "text-[10px] font-bold",
                  changePercent > 0 ? "text-accent-coral" : "text-accent-green"
                )}
              >
                {changePercent > 0 ? "+" : ""}
                {Math.abs(changePercent).toFixed(0)}%
              </span>
            )}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {formatCost(totalCost)} all-time spend
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Forge Cycles
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold leading-tight">{totalJobs}</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Avg Cost
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold leading-tight">
              {formatCost(avgCycleCost)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Top Model
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="truncate text-2xl font-bold leading-tight">
              {topModel ? topModel.name : "N/A"}
            </span>
            {topModel && (
              <span className="text-[10px] bg-muted px-1.5 rounded">
                {topModel.pct}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-border bg-card p-5">
          <span className="mb-4 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Spend by Format
          </span>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Video generations</span>
                <span>{formatCost(breakdown.video.cost)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent-coral"
                  style={{ width: `${videoPct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {breakdown.video.count} video {breakdown.video.count === 1 ? "job" : "jobs"}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Image generations</span>
                <span>{formatCost(breakdown.image.cost)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent-blue"
                  style={{ width: `${imagePct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {breakdown.image.count} image {breakdown.image.count === 1 ? "job" : "jobs"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <span className="mb-4 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Spend by Model
          </span>
          <div className="space-y-3">
            {modelEntries.length > 0 ? (
              modelEntries.map(([name, data], i) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/40 p-3"
                >
                  <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
                    <span
                      className="inline-block size-2 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="truncate">{name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold">
                    {formatCost(data.cost)}
                  </span>
                </div>
              ))
            ) : (
              <WorkspaceState
                tone="empty"
                icon={DollarSign}
                title="No model spend yet"
                description="Start a Clone or Generate an asset to see model-level cost signals here."
                action={{ href: "/ugc-clone", label: "Start Clone" }}
                secondaryAction={{ href: "/generate", label: "Open Generate" }}
                className="min-h-48 border-0 bg-transparent px-0 py-6"
              />
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-8">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Spend Over Time
              </span>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-accent-blue" />
                  Image
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-accent-coral" />
                  Video
                </span>
              </div>
            </div>
            <CostChart data={chartData} />
          </div>

          <div className="w-full lg:w-[360px] flex-shrink-0 flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4 block">
              Model Distribution
            </span>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-6 flex-1">
                <div className="w-36 h-36 flex-shrink-0">
                  <ModelPieChart data={pieData} />
                </div>
                <div className="flex flex-col gap-2.5 flex-1 min-w-0 justify-center">
                  {modelEntries.map(([name, data], i) => (
                    <div
                      key={name}
                      className="flex items-center justify-between text-[10px]"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="inline-block size-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="truncate text-foreground/80">{name}</span>
                      </span>
                      <span className="font-mono text-muted-foreground ml-2">
                        {totalModelCost > 0
                          ? ((data.cost / totalModelCost) * 100).toFixed(1)
                          : "0"}
                        %
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <WorkspaceState
                tone="empty"
                icon={DollarSign}
                title="No data yet"
                description="Model distribution appears after the first tracked production cost."
                action={{ href: "/ugc-clone", label: "Start Clone" }}
                className="min-h-48 border-0 bg-transparent px-0 py-6"
              />
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Cost Log
          </span>
          <span className="text-[10px] text-muted-foreground">
            {logs.length} {logs.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <ScrollArea className="max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/50">
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Time
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Model
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Type
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Cost
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-2"
                  >
                    <WorkspaceState
                      tone="empty"
                      icon={DollarSign}
                      title="No cost log entries yet"
                      description="Create production work to populate Spend with cost entries."
                      action={{ href: "/ugc-clone", label: "Start Clone" }}
                      secondaryAction={{ href: "/generate", label: "Open Generate" }}
                      className="min-h-56 border-0 bg-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pagedLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="even:bg-muted/30 hover:bg-muted transition-colors"
                  >
                    <TableCell className="text-[11px] font-mono text-muted-foreground">
                      {formatRelativeDate(log.createdAt)}
                    </TableCell>
                    <TableCell className="text-[11px] font-medium">
                      {log.model}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          log.type === "image"
                            ? "bg-accent-coral/20 text-accent-coral"
                            : "bg-accent-blue/20 text-accent-blue"
                        )}
                      >
                        {log.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-[11px] font-mono">
                      {formatCost(log.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {totalPages > 1 && (
          <div className="px-5 py-2 border-t border-border flex items-center justify-between bg-muted/30">
            <span className="text-[10px] text-muted-foreground">
              PAGE{" "}
              <span className="font-mono font-bold text-foreground">
                {logPage + 1}
              </span>{" "}
              / {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={logPage === 0}
                onClick={() => setLogPage((p) => p - 1)}
                className="p-1.5 border border-border rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                disabled={logPage >= totalPages - 1}
                onClick={() => setLogPage((p) => p + 1)}
                className="p-1.5 border border-border rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
