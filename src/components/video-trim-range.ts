export const TRIM_TIME_PRECISION = 100;
export const MIN_TRIM_DURATION_SEC = 0.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function snapTrimTime(value: number): number {
  return Math.round(value * TRIM_TIME_PRECISION) / TRIM_TIME_PRECISION;
}

export function formatTrimTime(sec: number): string {
  return `${snapTrimTime(sec).toFixed(2)}s`;
}

export function normalizeTrimRange({
  startTime,
  endTime,
  durationSec,
  minDurationSec = MIN_TRIM_DURATION_SEC,
  maxDurationSec,
}: {
  startTime: number;
  endTime: number;
  durationSec: number;
  minDurationSec?: number;
  maxDurationSec?: number;
}) {
  const safeDuration = Math.max(0, snapTrimTime(durationSec));
  const safeMinDuration = Math.min(minDurationSec, safeDuration);
  const safeMaxDuration =
    typeof maxDurationSec === "number" && Number.isFinite(maxDurationSec)
      ? Math.max(safeMinDuration, snapTrimTime(maxDurationSec))
      : null;
  const maxStart = Math.max(0, safeDuration - safeMinDuration);
  const normalizedStart = clamp(snapTrimTime(startTime), 0, maxStart);
  const maxEnd = safeMaxDuration
    ? Math.min(safeDuration, normalizedStart + safeMaxDuration)
    : safeDuration;
  const normalizedEnd = clamp(
    snapTrimTime(endTime),
    normalizedStart + safeMinDuration,
    maxEnd
  );
  const trimmedDuration = snapTrimTime(normalizedEnd - normalizedStart);
  const removedFromStart = snapTrimTime(normalizedStart);
  const removedFromEnd = snapTrimTime(safeDuration - normalizedEnd);

  return {
    startTime: normalizedStart,
    endTime: normalizedEnd,
    trimmedDuration,
    removedFromStart,
    removedFromEnd,
    hasTrim: removedFromStart > 0 || removedFromEnd > 0,
  };
}

export function getTrimSummary({
  startTime,
  endTime,
  durationSec,
  maxDurationSec,
}: {
  startTime: number;
  endTime: number;
  durationSec: number;
  maxDurationSec?: number;
}): string {
  const range = normalizeTrimRange({ startTime, endTime, durationSec, maxDurationSec });

  if (!range.hasTrim) {
    return "Full video selected. No trim will be applied.";
  }

  const removals = [
    range.removedFromStart > 0
      ? `${formatTrimTime(range.removedFromStart)} from start`
      : null,
    range.removedFromEnd > 0
      ? `${formatTrimTime(range.removedFromEnd)} from end`
      : null,
  ].filter(Boolean);

  return `Will submit ${formatTrimTime(range.startTime)} - ${formatTrimTime(
    range.endTime
  )}. Removes ${removals.join(" and ")}.`;
}
