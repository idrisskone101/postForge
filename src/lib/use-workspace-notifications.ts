"use client";

import { useEffect, useState } from "react";
import { fetchWorkspaceFeature } from "@/lib/workspace-features-client";

export type WorkspaceNotificationCounts = {
  generationFailures: number;
  approvalsWaiting: number;
};

export type WorkspaceSidebarStatus = {
  /** Counts already gated by the Settings > Notifications toggles: a hidden count is 0. */
  counts: WorkspaceNotificationCounts;
  workspaceName: string;
};

/**
 * Sidebar status: the workspace name and the failed-job and needs-review
 * counts. A count shows only while its Settings > Notifications toggle is on.
 * Polls every minute and on focus.
 */
export function useWorkspaceNotifications(enabled: boolean): WorkspaceSidebarStatus {
  const [status, setStatus] = useState(EMPTY_STATUS);

  useEffect(() => (enabled ? startPolling(setStatus) : undefined), [enabled]);

  return status;
}

export type WorkspaceSidebarSettings = {
  id: string;
  workspaceName?: string;
  emailFailures?: boolean;
  emailApprovals?: boolean;
};

const DEFAULT_WORKSPACE_NAME = "PostForge";
const EMPTY_STATUS: WorkspaceSidebarStatus = {
  counts: { generationFailures: 0, approvalsWaiting: 0 },
  workspaceName: DEFAULT_WORKSPACE_NAME,
};
const POLL_INTERVAL_MS = 60_000;

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** Pure merge of the stored settings and the polled counts. Exported for tests. */
export function resolveSidebarStatus(
  settings: WorkspaceSidebarSettings | undefined,
  counts: Partial<WorkspaceNotificationCounts>
): WorkspaceSidebarStatus {
  const valid = isCount(counts.generationFailures) && isCount(counts.approvalsWaiting);
  return {
    workspaceName: settings?.workspaceName?.trim() || DEFAULT_WORKSPACE_NAME,
    counts: {
      generationFailures:
        valid && settings?.emailFailures === true ? counts.generationFailures ?? 0 : 0,
      approvalsWaiting:
        valid && settings?.emailApprovals === true ? counts.approvalsWaiting ?? 0 : 0,
    },
  };
}

async function fetchSidebarStatus(): Promise<WorkspaceSidebarStatus | null> {
  try {
    const [{ records }, response] = await Promise.all([
      fetchWorkspaceFeature<WorkspaceSidebarSettings>("connections"),
      fetch("/api/workspace-notifications", { cache: "no-store" }),
    ]);
    if (!response.ok) return null;
    return resolveSidebarStatus(
      records.find((record) => record.id === "workspace-settings"),
      await response.json()
    );
  } catch {
    return null;
  }
}

function startPolling(onStatus: (status: WorkspaceSidebarStatus) => void) {
  let cancelled = false;
  const refresh = () => {
    void fetchSidebarStatus().then((next) => {
      if (next && !cancelled) onStatus(next);
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
