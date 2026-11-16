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
      enterStep(node);
    },
  };
}

/**
 * Moves focus to a step and puts the page at the top. Focus goes first: FocusReveal answers a keyboard
 * focus by scrolling a step taller than the viewport to the nearest edge, and the scroll to the top has
 * to be the last word.
 */
export function enterStep(node: HTMLElement) {
  node.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}
