"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { CLONE_SETUP_STEPS } from "@/components/clone/constants";
import type { CloneSetupStep } from "@/components/clone/types";
import { enterStep } from "@/lib/use-step-entry";

/**
 * The Step Entry Rule for Clone. Its steps stay mounted and are hidden, so entry is the change from
 * hidden to shown: the page scrolls to the top at once and focus moves to the step's labelled section.
 */
export function useCloneStepEntry(step: CloneSetupStep, hidden: boolean) {
  const ref = useRef<HTMLElement>(null);
  const wasHidden = useRef(hidden);
  useEffect(watchLastInput, []);
  useLayoutEffect(() => {
    const entered = wasHidden.current && !hidden;
    wasHidden.current = hidden;
    if (!entered) return;
    if (ref.current) {
      markStepFocus(ref.current);
      enterStep(ref.current);
    }
  }, [hidden]);
  const index = CLONE_SETUP_STEPS.findIndex((item) => item.id === step);
  return {
    ref,
    tabIndex: -1,
    "aria-label": `Step ${index + 1} of ${CLONE_SETUP_STEPS.length}: ${CLONE_SETUP_STEPS[index].label}`,
  };
}

/** Gives a step focus that its own content dropped, in place: the page does not scroll. */
export function focusCloneStep(node: HTMLElement) {
  markStepFocus(node);
  node.focus({ preventScroll: true });
}

/**
 * A browser shows a focus ring on anything a script focuses before the first pointer press, so a deep
 * link that lands on a later step drew the ring with no keyboard in use. The step records whether a key
 * was the last input, and the ring is drawn only then.
 */
let lastInputWasKey = false;

function markStepFocus(node: HTMLElement) {
  node.toggleAttribute("data-keyboard-entry", lastInputWasKey);
}

function watchLastInput() {
  const onKeyDown = () => {
    lastInputWasKey = true;
  };
  const onPointerDown = () => {
    lastInputWasKey = false;
  };
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  return () => {
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("pointerdown", onPointerDown, true);
  };
}

export const CLONE_STEP_FOCUS_CLASS =
  "rounded-lg outline-offset-4 [&:not([data-keyboard-entry])]:outline-none data-[keyboard-entry]:focus-visible:[outline:2px_solid_var(--pf-ember)]";
