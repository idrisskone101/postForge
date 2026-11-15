"use client";

import { useLayoutEffect, useRef } from "react";
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
  useLayoutEffect(() => {
    const entered = wasHidden.current && !hidden;
    wasHidden.current = hidden;
    if (!entered) return;
    if (ref.current) enterStep(ref.current);
  }, [hidden]);
  const index = CLONE_SETUP_STEPS.findIndex((item) => item.id === step);
  return {
    ref,
    tabIndex: -1,
    "aria-label": `Step ${index + 1} of ${CLONE_SETUP_STEPS.length}: ${CLONE_SETUP_STEPS[index].label}`,
  };
}

export const CLONE_STEP_FOCUS_CLASS =
  "rounded-lg focus-visible:[outline:2px_solid_var(--pf-ember)] focus-visible:outline-offset-4";
