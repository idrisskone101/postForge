"use client";

import { useEffect } from "react";

export function PlaybookEscape({ onClose }: { onClose: () => void }) {
  useEffect(() => listenForEscape(onClose), [onClose]);
  useEffect(focusLiveOverlay, []);
  return null;
}

/** Moves focus into the picker when it opens, unless the first-paint handoff already placed it there. */
function focusLiveOverlay() {
  const live = Array.from(
    document.querySelectorAll<HTMLElement>("[data-automation-overlay]")
  ).find((overlay) => !overlay.closest("[data-playbook-first-paint]"));
  if (!live || live.contains(document.activeElement)) return;
  live.querySelector<HTMLElement>("[data-automation-dialog]")?.focus();
}

function listenForEscape(onClose: () => void) {
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") onClose();
  };
  window.addEventListener("keydown", closeOnEscape);
  return () => window.removeEventListener("keydown", closeOnEscape);
}
