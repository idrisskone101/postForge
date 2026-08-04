export const MAX_MOTION_SOURCE_DURATION_SEC = 30;
export const MOTION_SOURCE_DURATION_TOLERANCE_SEC = 0.5;

export function isMotionSourceWithinLimit(durationSec: number | null | undefined): boolean {
  return (
    typeof durationSec === "number" &&
    Number.isFinite(durationSec) &&
    durationSec <= MAX_MOTION_SOURCE_DURATION_SEC + MOTION_SOURCE_DURATION_TOLERANCE_SEC
  );
}
