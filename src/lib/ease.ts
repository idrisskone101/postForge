/** Mirrors globals.css --pf-ease-* / --t-duration-*. Edit CSS first. */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;
export const EASE_SMOOTH_OUT = [0.22, 1, 0.36, 1] as const;

export const EASE_OUT_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";
export const EASE_IN_OUT_CSS = "cubic-bezier(0.77, 0, 0.175, 1)";
export const EASE_SMOOTH_OUT_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Spring configs for future motion/react use. Not imported by chrome in v1. */
export const SPRING_PRESS = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.6,
} as const;

export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 360,
  damping: 32,
  mass: 0.6,
} as const;

export const DURATION = {
  instant: 100,
  fast: 180,
  normal: 220,
  moderate: 320,
  slow: 480,
} as const;

export type BezierTuple = readonly [number, number, number, number];
export type SpringConfig = typeof SPRING_PRESS;
