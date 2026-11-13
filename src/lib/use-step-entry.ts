"use client";

import { useRef } from "react";

/**
 * Starts each step of a multi-step form from its top. Call `markStepChange` when the step changes and
 * put `stepRef` on the keyed step container (`tabIndex={-1}`): once the new step mounts, the page
 * scrolls to the top and focus moves to the container.
 */
export function useStepEntry() {
  const pending = useRef(false);
  return {
    markStepChange() {
      pending.current = true;
    },
    stepRef(node: HTMLElement | null) {
      if (!node || !pending.current) return;
      pending.current = false;
      window.scrollTo({ top: 0, behavior: "instant" });
      node.focus({ preventScroll: true });
    },
  };
}
