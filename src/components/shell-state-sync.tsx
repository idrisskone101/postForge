"use client";

import { useLayoutEffect } from "react";

/**
 * The inline script in the app layout sets the theme and the sidebar state before first paint. A
 * not-found page is rendered in the browser from an empty document, where a script React inserts
 * never runs, so the page came up light and expanded whatever was stored. This applies the same
 * state before the browser paints. On a server-rendered page it repeats what the script did.
 */
export function ShellStateSync() {
  useLayoutEffect(applyStoredShellState, []);
  return null;
}

function applyStoredShellState() {
  const root = document.documentElement;
  let theme: string | null = null;
  let collapsed: string | null = null;
  try {
    theme = localStorage.getItem("postforge-theme");
    collapsed = localStorage.getItem("postforge-sidebar-collapsed");
  } catch {
    // Storage is unavailable: dark and expanded, as in the layout script.
  }
  root.classList.toggle("dark", theme !== "light");
  if (collapsed === "true") root.dataset.sidebarCollapsed = "true";
  else delete root.dataset.sidebarCollapsed;
}
