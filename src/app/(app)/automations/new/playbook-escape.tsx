"use client";

import { useEffect } from "react";

export function PlaybookEscape({ onClose }: { onClose: () => void }) {
  useEffect(() => listenForEscape(onClose), [onClose]);
  return null;
}

function listenForEscape(onClose: () => void) {
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") onClose();
  };
  window.addEventListener("keydown", closeOnEscape);
  return () => window.removeEventListener("keydown", closeOnEscape);
}
