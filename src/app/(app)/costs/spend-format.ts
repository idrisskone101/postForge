import { MODEL_REGISTRY } from "@/lib/ai/model-registry";
import type { SpendPeriod } from "@/lib/costs/spend-period";
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

export function changeLabel(changePercent: number) {
  if (changePercent === 0 || !Number.isFinite(changePercent)) return null;
  const rounded = Math.round(changePercent);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
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
