"use client";

import { useEffect, useRef, useState } from "react";
import { EXIT_MS } from "@/lib/use-exit-presence";

export function PlaybookEscape({ onClose }: { onClose: () => void }) {
  useEffect(() => listenForEscape(onClose), [onClose]);
  useEffect(focusLiveOverlay, []);
  return null;
}

/** Runs a close or apply handler after the overlay's exit, and reports the exit so the overlay can draw it. */
export function usePlaybookExit() {
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);
  const leaveThen = (done: () => void) => {
    if (started.current) return;
    started.current = true;
    setLeaving(true);
    window.setTimeout(done, EXIT_MS);
  };
  return { leaving, leaveThen };
}

/**
 * Moves focus into the picker when it opens, unless the first-paint handoff already placed it there,
 * and returns it to the control that opened the picker when it closes.
 */
function focusLiveOverlay() {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const live = Array.from(
    document.querySelectorAll<HTMLElement>("[data-automation-overlay]")
  ).find((overlay) => !overlay.closest("[data-playbook-first-paint]"));
  if (live && !live.contains(document.activeElement)) {
    live.querySelector<HTMLElement>("[data-automation-dialog]")?.focus();
  }
  return () => {
    if (opener?.isConnected && opener !== document.body) opener.focus();
  };
}

function listenForEscape(onClose: () => void) {
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") onClose();
  };
  window.addEventListener("keydown", closeOnEscape);
  return () => window.removeEventListener("keydown", closeOnEscape);
}
