"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True once the element has come within 300px of the viewport, and from then on.
 * Media that waits for it is not requested for rows far below the fold.
 */
export function useNearViewport(ref: RefObject<Element | null>, enabled = true): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setNear(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: NEAR_VIEWPORT_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, enabled]);

  return near;
}

const NEAR_VIEWPORT_MARGIN = "300px";
