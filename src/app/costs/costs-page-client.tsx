"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
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
import { DollarSign, TrendingUp, Crown, Flame, Download, ArrowUp, ArrowDown } from "lucide-react";

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

  const handlePeriodChange = (value: string) => {
    if (value) router.push(`/costs?period=${value}`);
  };

  const exportCSV = () => {
    const header = "Date,Model,Type,Amount\n";
    const rows = logs.map((l) =>
      `${l.createdAt},${l.model},${l.type},${l.amount}`
    ).join("\n");
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

  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value === 0) return null;
    const isUp = value > 0;
    return (
      <Badge
        variant="secondary"
        className={`text-[10px] gap-0.5 ${isUp ? "text-accent-coral" : "text-accent-green"}`}
      >
        {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
        {Math.abs(value).toFixed(0)}%
      </Badge>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Analytics & Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your generation spending and usage
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ToggleGroup
            value={[period]}
            onValueChange={(v) => { if (v.length > 0) handlePeriodChange(v[v.length - 1]); }}
          >
            <ToggleGroupItem value="7d" className="text-xs">7D</ToggleGroupItem>
            <ToggleGroupItem value="30d" className="text-xs">30D</ToggleGroupItem>
            <ToggleGroupItem value="90d" className="text-xs">90D</ToggleGroupItem>
          </ToggleGroup>

          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Separator />

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spend
            </CardTitle>
            <DollarSign className="size-4 text-accent-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(currentPeriodCost)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <ChangeIndicator value={changePercent} />
              <span className="text-xs text-muted-foreground">vs prev period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Forge Cycles
            </CardTitle>
            <Flame className="size-4 text-accent-coral" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              total generations
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Cycle Cost
            </CardTitle>
            <TrendingUp className="size-4 text-accent-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(avgCycleCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">per generation</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Favorite Model
            </CardTitle>
            <Crown className="size-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {topModel ? topModel.name : "N/A"}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {topModel && (
                <Badge variant="secondary" className="text-[10px]">
                  {topModel.pct}% usage
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Trajectory */}
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Spending Trajectory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CostChart data={chartData} />
          </CardContent>
        </Card>

        {/* Model Split */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Model Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ModelPieChart data={pieData} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forge Logs */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Forge Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No logs yet
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatRelativeDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {log.model}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {log.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCost(log.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                Page {logPage + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logPage === 0}
                  onClick={() => setLogPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logPage >= totalPages - 1}
                  onClick={() => setLogPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
