"use client";

import { useEffect, useState } from "react";

export type WorkspaceNotificationCounts = {
  generationFailures: number;
  approvalsWaiting: number;
};

/** Failed-job and needs-review counts for the sidebar badges. Polls every minute and on focus. */
export function useWorkspaceNotifications(enabled: boolean): WorkspaceNotificationCounts {
  const [counts, setCounts] = useState(EMPTY_COUNTS);

  useEffect(() => (enabled ? startPolling(setCounts) : undefined), [enabled]);

  return counts;
}

const EMPTY_COUNTS: WorkspaceNotificationCounts = {
  generationFailures: 0,
  approvalsWaiting: 0,
};
const POLL_INTERVAL_MS = 60_000;

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

async function fetchNotificationCounts(): Promise<WorkspaceNotificationCounts | null> {
  try {
    const response = await fetch("/api/workspace-notifications", { cache: "no-store" });
    if (!response.ok) return null;
    const counts: Partial<WorkspaceNotificationCounts> = await response.json();
    if (!isCount(counts.generationFailures) || !isCount(counts.approvalsWaiting)) {
      return null;
    }
    return {
      generationFailures: counts.generationFailures,
      approvalsWaiting: counts.approvalsWaiting,
    };
  } catch {
    return null;
  }
}

function startPolling(onCounts: (counts: WorkspaceNotificationCounts) => void) {
  let cancelled = false;
  const refresh = () => {
    void fetchNotificationCounts().then((next) => {
      if (next && !cancelled) onCounts(next);
    });
  };

  refresh();
  const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
  window.addEventListener("focus", refresh);
  return () => {
    cancelled = true;
    window.clearInterval(interval);
    window.removeEventListener("focus", refresh);
  };
}
