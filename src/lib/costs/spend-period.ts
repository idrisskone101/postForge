export const SPEND_PERIODS = ["7d", "30d", "90d"] as const;
export type SpendPeriod = (typeof SPEND_PERIODS)[number];

export const COST_LOG_PAGE_SIZE = 10;

export type SpendRange = {
  period: SpendPeriod;
  periodDays: number;
  start: Date;
  end: Date;
  previousStart: Date;
};

export type DailyCostRow = {
  day: string;
  type: string;
  cost: number;
};

export type SpendChartPoint = {
  date: string;
  image: number;
  video: number;
};

export function parseSpendPeriod(param: string | undefined): SpendPeriod {
  if (param === "7d" || param === "30d" || param === "90d") {
    return param;
  }
  return "30d";
}

export function spendPeriodDays(period: SpendPeriod): number {
  switch (period) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default: {
      const exhaustive: never = period;
      return exhaustive;
    }
  }
}

export function spendWindow(period: SpendPeriod, now = new Date()): SpendRange {
  const periodDays = spendPeriodDays(period);
  const start = new Date(now);
  start.setDate(start.getDate() - (periodDays - 1));
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - periodDays);
  return { period, periodDays, start, end, previousStart };
}

export function parseLogPage(param: string | undefined): number {
  if (param == null || param === "") return 0;
  const parsed = Number.parseInt(param, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

export type CostLogListFilter = {
  search: string;
  model: string | null;
};

export function parseCostLogSearch(param: string | undefined): string {
  return param?.trim() ?? "";
}

export function parseCostLogModel(param: string | undefined): string | null {
  if (param == null) return null;
  const model = param.trim();
  if (model === "" || model === "all") return null;
  return model;
}

export function hasCostLogFilter(filter: CostLogListFilter): boolean {
  return filter.search.length > 0 || filter.model != null;
}

export type CostLogCsvRow = {
  createdAt: string;
  jobId: string;
  model: string;
  type: string;
  amount: number;
};

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function formatCostLogCsv(rows: CostLogCsvRow[]): string {
  const header = ["Date", "Job", "Model", "Type", "Amount"];
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [row.createdAt, row.jobId, row.model, row.type, row.amount].map(csvCell).join(",")
    ),
  ];
  return lines.join("\n");
}

export function spendDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function roundSpendCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function periodChangePercent(currentTotal: number, previousTotal: number): number {
  if (!(previousTotal > 0)) return 0;
  return ((currentTotal - previousTotal) / previousTotal) * 100;
}

export function formatSpendChartLabel(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function buildDailyChartSeries(
  start: Date,
  periodDays: number,
  rows: DailyCostRow[]
): SpendChartPoint[] {
  const dailyMap = new Map<string, { image: number; video: number }>();
  for (let i = 0; i < periodDays; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    dailyMap.set(spendDayKey(day), { image: 0, video: 0 });
  }

  for (const row of rows) {
    const entry = dailyMap.get(row.day);
    if (!entry) continue;
    if (row.type === "image") entry.image += row.cost;
    else entry.video += row.cost;
  }

  return Array.from(dailyMap.entries()).map(([day, costs]) => ({
    date: formatSpendChartLabel(day),
    image: roundSpendCents(costs.image),
    video: roundSpendCents(costs.video),
  }));
}

export function costsHref(args: {
  period: SpendPeriod;
  logPage?: number;
  search?: string;
  model?: string | null;
}): string {
  const params = new URLSearchParams({ period: args.period });
  const logPage = args.logPage ?? 0;
  if (logPage > 0) params.set("logPage", String(logPage));
  const search = args.search?.trim() ?? "";
  if (search.length > 0) params.set("q", search);
  const model = args.model ?? null;
  if (model) params.set("model", model);
  return `/costs?${params.toString()}`;
}
