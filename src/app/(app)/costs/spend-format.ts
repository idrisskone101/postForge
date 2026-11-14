import { MODEL_REGISTRY } from "@/lib/ai/model-registry";
import { roundSpendCents, type SpendChartPoint, type SpendPeriod } from "@/lib/costs/spend-period";
import { formatCost } from "@/lib/utils/format-cost";

const PERIOD_DAYS: Record<SpendPeriod, number> = { "7d": 7, "30d": 30, "90d": 90 };
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const counted = new Intl.NumberFormat("en");

export function periodDays(period: SpendPeriod) {
  return PERIOD_DAYS[period];
}

/** Whole dollars stay whole ("$250"); anything else keeps its cents. */
export function budgetMoney(amount: number) {
  return Number.isInteger(amount) ? `$${counted.format(amount)}` : formatCost(amount);
}

export function axisMoney(amount: number) {
  if (amount === 0) return "$0";
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/** A round axis top a little above the tallest day. */
export function niceMoneyCeiling(value: number) {
  if (!(value > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(
    (candidate) => candidate * magnitude >= value,
  );
  return (step ?? 10) * magnitude;
}

/** Dollar change against the previous window ("+$0.24", "-$1.10"); null when there was no previous window. */
export function changeLabel(current: number, previous: number | null) {
  if (previous === null || !Number.isFinite(previous) || !Number.isFinite(current)) return null;
  const cents = Math.round((current - previous) * 100);
  if (cents === 0) return null;
  return `${cents < 0 ? "-" : "+"}${formatCost(Math.abs(cents) / 100)}`;
}

export function createdLabel(value: string, now: Date) {
  const created = new Date(value);
  if (Number.isNaN(created.valueOf())) return "-";
  const sameDay = created.toDateString() === now.toDateString();
  return `${sameDay ? "Today" : dayMonth.format(created)} ${time.format(created)}`;
}

export function logRangeLabel(page: number, pageSize: number, total: number) {
  const start = page * pageSize + 1;
  const end = Math.min(total, start + pageSize - 1);
  return `${counted.format(start)}-${counted.format(end)} / ${counted.format(total)}`;
}

export function typeLabel(type: string) {
  return type ? type[0].toUpperCase() + type.slice(1) : "-";
}

/** The registry display name; a model that left the registry keeps its stored id. */
export function modelLabel(model: string) {
  return MODEL_REGISTRY[model]?.name ?? model;
}

export function shortJobId(jobId: string) {
  return jobId.slice(0, 8);
}

export type SpendChartBar = { label: string; date: string; image: number; video: number };
export type SpendChartBars = { unit: "day" | "week"; bars: SpendChartBar[]; barSize: number };

const MIN_SLOT = 4;
const MAX_BAR = 14;

/**
 * Days when each day gets a 3px bar and a 1px gap in `width`, otherwise weeks counted back from
 * today so the last bar is the current week. Totals are the same either way. An unmeasured
 * width (0, before layout) keeps days.
 */
export function spendChartBars(points: SpendChartPoint[], width: number): SpendChartBars {
  const daily = width <= 0 || points.length === 0 || width / points.length >= MIN_SLOT;
  const bars = daily ? points.map((point) => ({ ...point, label: point.date })) : weeklyBars(points);
  const slot = bars.length > 0 ? width / bars.length : width;
  const barSize = Math.max(3, Math.min(MAX_BAR, Math.floor(slot) - Math.max(1, Math.ceil(slot * 0.25))));
  return { unit: daily ? "day" : "week", bars, barSize };
}

function weeklyBars(points: SpendChartPoint[]): SpendChartBar[] {
  const bars: SpendChartBar[] = [];
  for (let end = points.length; end > 0; end -= 7) {
    const week = points.slice(Math.max(0, end - 7), end);
    const first = week[0].date;
    const last = week[week.length - 1].date;
    bars.unshift({
      label: first === last ? first : `${first} to ${last}`,
      date: first,
      image: roundSpendCents(week.reduce((sum, point) => sum + point.image, 0)),
      video: roundSpendCents(week.reduce((sum, point) => sum + point.video, 0)),
    });
  }
  return bars;
}
