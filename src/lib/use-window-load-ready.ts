"use client";

import { useEffect, useState } from "react";

/**
 * True once the window has loaded and the first paint has reached the screen.
 * Callers swap their first-paint markup for the full client UI on this signal.
 * Swapping between the paint and its presentation would drop the painted title
 * from the page's largest-contentful-paint record, so load alone is too early.
 */
export function useWindowLoadReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer = 0;
    let observer: PerformanceObserver | null = null;
    const go = () => {
      observer?.disconnect();
      window.clearTimeout(timer);
      setReady(true);
    };
    const afterLoad = () => {
      // A hidden tab never paints; browsers without paint timing fall through the timeout.
      const waitForPaint =
        document.visibilityState === "visible" &&
        typeof PerformanceObserver !== "undefined" &&
        PerformanceObserver.supportedEntryTypes?.includes("paint") &&
        performance.getEntriesByName("first-contentful-paint").length === 0;
      if (!waitForPaint) {
        timer = window.setTimeout(go, 0);
        return;
      }
      observer = new PerformanceObserver((list) => {
        if (list.getEntriesByName("first-contentful-paint").length > 0) go();
      });
      observer.observe({ type: "paint", buffered: true });
      timer = window.setTimeout(go, FIRST_PAINT_WAIT_MS);
    };
    if (document.readyState === "complete") {
      afterLoad();
    } else {
      window.addEventListener("load", afterLoad);
    }
    return () => {
      observer?.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("load", afterLoad);
    };
  }, []);
  return ready;
}

const FIRST_PAINT_WAIT_MS = 1000;
