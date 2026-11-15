"use client";

import { useEffect, useState } from "react";

/**
 * Keeps a conditionally shown element mounted for its exit animation.
 * `mounted` stays true for `exitMs` after `show` turns false, and `leaving` is true during that time.
 */
export function useExitPresence(show: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(show);

  useEffect(() => {
    if (show) {
      const frame = window.requestAnimationFrame(() => setMounted(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [show, exitMs]);

  return { mounted: show || mounted, leaving: !show && mounted };
}

/** Matches --pf-dur-exit. */
export const EXIT_MS = 160;

/**
 * Keeps the last non-null value for its exit animation: an overlay drawn from nullable state stays
 * mounted, with what it last showed, for `exitMs` after the state clears. `leaving` is true then.
 */
export function useLingering<T>(value: T | null, exitMs = EXIT_MS) {
  const [last, setLast] = useState(value);
  if (value !== null && value !== last) setLast(value);
  const { mounted, leaving } = useExitPresence(value !== null, exitMs);
  return { value: value ?? (mounted ? last : null), leaving };
}
