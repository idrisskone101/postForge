"use client";

import { useEffect, useRef, useState } from "react";
import { EXIT_MS } from "@/lib/use-exit-presence";

export function PlaybookEscape({ onClose }: { onClose: () => void }) {
  useEffect(() => listenForKeys(onClose), [onClose]);
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
 * makes everything outside the picker inert while it is open, and returns focus to the control that
 * opened it. The first-visit picker has no opener, so focus goes to the Browse playbooks button.
 */
function focusLiveOverlay() {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const live = liveOverlay();
  if (live && !live.contains(document.activeElement)) {
    live.querySelector<HTMLElement>("[data-automation-dialog]")?.focus();
  }
  const inerted = live ? inertOutside(live) : [];
  return () => {
    for (const element of inerted) element.inert = false;
    if (opener?.isConnected && opener !== document.body && !opener.closest("[data-automation-overlay]")) {
      opener.focus();
    } else {
      focusOpenerWhenMounted();
    }
  };
}

function focusOpenerWhenMounted() {
  const tryFocus = () => {
    const opener = document.querySelector<HTMLElement>(OPENER);
    if (!opener) return false;
    if (document.activeElement === document.body || !document.activeElement) opener.focus();
    return true;
  };
  if (tryFocus()) return;
  const observer = new MutationObserver(() => {
    if (tryFocus()) stop();
  });
  const timeout = window.setTimeout(() => stop(), OPENER_WAIT_MS);
  const stop = () => {
    observer.disconnect();
    window.clearTimeout(timeout);
  };
  observer.observe(document.body, { childList: true, subtree: true });
}

const OPENER = "[data-playbook-opener]";
const OPENER_WAIT_MS = 5000;

function liveOverlay() {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-automation-overlay]")).find(
    (overlay) => !overlay.closest("[data-playbook-first-paint]")
  );
}

function inertOutside(overlay: HTMLElement) {
  const inerted: HTMLElement[] = [];
  for (let node: HTMLElement | null = overlay; node && node !== document.body; node = node.parentElement) {
    for (const sibling of Array.from(node.parentElement?.children ?? [])) {
      if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert) continue;
      sibling.inert = true;
      inerted.push(sibling);
    }
  }
  return inerted;
}

function listenForKeys(onClose: () => void) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") onClose();
    if (event.key === "Tab") wrapTab(event);
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}

function wrapTab(event: KeyboardEvent) {
  const dialog = liveOverlay()?.querySelector<HTMLElement>("[data-automation-dialog]");
  if (!dialog) return;
  const stops = Array.from(
    dialog.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]")
  ).filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0);
  const first = stops[0];
  const last = stops[stops.length - 1];
  const active = document.activeElement;
  const outside = !dialog.contains(active) || active === dialog;
  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault();
    first?.focus();
  }
}
