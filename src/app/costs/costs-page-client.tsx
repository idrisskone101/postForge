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
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { PIE_COLORS } from "@/components/cost-chart";

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

export function CostsPageClient({
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
}: CostsPageClientProps) {
  const router = useRouter();
  const [logPage, setLogPage] = useState(0);

  const modelEntries = Object.entries(byModel).sort(
    (a, b) => b[1].cost - a[1].cost
  );

  const pieData = modelEntries.map(([name, data]) => ({
    name,
    value: Math.round(data.cost * 100) / 100,
  }));

  const totalModelCost = modelEntries.reduce((s, [, d]) => s + d.cost, 0);

  const handlePeriodChange = (value: string) => {
    if (value) router.push(`/costs?period=${value}`);
  };

  const exportCSV = () => {
    const header = "Date,Model,Type,Amount\n";
    const rows = logs
      .map((l) => `${l.createdAt},${l.model},${l.type},${l.amount}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `postforge-analytics-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pagedLogs = logs.slice(
    logPage * LOGS_PAGE_SIZE,
    (logPage + 1) * LOGS_PAGE_SIZE
  );
  const totalPages = Math.ceil(logs.length / LOGS_PAGE_SIZE);

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="text-xl font-bold">
            Spend
          </h1>
          <p className="text-xs text-muted-foreground">
            Track your generation spending and usage
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center text-[11px] font-semibold tracking-wide">
            {(["7d", "30d", "90d"] as const).map((p, i) => (
              <React.Fragment key={p}>
                {i > 0 && <span className="text-foreground/20">|</span>}
                <button
                  onClick={() => handlePeriodChange(p)}
                  className={cn(
                    "px-2 transition-colors",
                    period === p
                      ? "text-foreground border-b border-accent-coral"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.toUpperCase()}
                </button>
              </React.Fragment>
            ))}
          </div>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={exportCSV}
                  className="p-2 border border-border rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                />
              }
            >
              <Download className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="bg-card border border-border rounded-lg overflow-hidden flex divide-x divide-border py-3">
        {/* Spend */}
        <div className="flex-1 px-6 flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Spend
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold leading-tight">
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
        </div>

        {/* Forge Cycles */}
        <div className="flex-1 px-6 flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Forge Cycles
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold leading-tight">{totalJobs}</span>
          </div>
        </div>

        {/* Avg Cost */}
        <div className="flex-1 px-6 flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Avg Cost
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold leading-tight">
              {formatCost(avgCycleCost)}
            </span>
          </div>
        </div>

        {/* Top Model */}
        <div className="flex-1 px-6 flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Top Model
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold leading-tight truncate">
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

      {/* Charts — unified panel */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-8">
          {/* Spending chart */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Spending Trajectory
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

          {/* Model distribution */}
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
              <p className="text-sm text-muted-foreground text-center py-8">
                No data yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Forge Logs */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Header bar */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Recent Activity
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
                    className="text-center text-muted-foreground py-8"
                  >
                    No logs yet
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
