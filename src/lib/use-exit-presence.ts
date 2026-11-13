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
