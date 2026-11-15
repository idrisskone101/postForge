import { dayMonth, dayMonthTime } from "@/lib/day-month";
import type {
  ConnectedIntegrationAccountStatus,
  PublicIntegrationStatus,
} from "@/lib/integrations-client";

export type ProviderState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "not_configured" }
  | { kind: "ready" }
  | { kind: "connected" };

export type CellTone = "fg" | "warn" | "bad" | "muted";
export type Cell = { text: string; tone: CellTone; sub?: string };
export type Chip = {
  tone: "ok" | "warn" | "bad" | "neutral";
  icon?: "check" | "alert";
  label: string;
};
export type Notice = { tone: "warn" | "bad"; lead: string; text: string };

export function providerState(
  status: PublicIntegrationStatus | null,
  loading: boolean
): ProviderState {
  if (!status) return loading ? { kind: "loading" } : { kind: "unavailable" };
  if (status.connected && status.accounts.length > 0) return { kind: "connected" };
  if (status.configuration === "not_configured") return { kind: "not_configured" };
  return { kind: "ready" };
}

export function providerChip(state: ProviderState): Chip {
  switch (state.kind) {
    case "unavailable":
      return { tone: "bad", label: "Status unavailable" };
    case "not_configured":
      return { tone: "neutral", label: "Not configured" };
    case "connected":
      return { tone: "ok", icon: "check", label: "Connected" };
    case "loading":
    case "ready":
      return { tone: "neutral", label: "Not connected" };
  }
}

export function needsReauthorization(account: ConnectedIntegrationAccountStatus) {
  return account.authorization.status !== "healthy";
}

export function accountChip(account: ConnectedIntegrationAccountStatus): Chip {
  if (needsReauthorization(account)) {
    return { tone: "warn", icon: "alert", label: "Reconnect required" };
  }
  return { tone: "ok", icon: "check", label: "Connected" };
}

export function metricsCell(account: ConnectedIntegrationAccountStatus): Cell {
  const last = lastSyncLine(account);
  if (needsReauthorization(account)) return { text: "Paused", tone: "warn", sub: last };
  if (!account.capabilities.metrics) {
    return { text: "Not granted", tone: "warn", sub: "Metrics scope missing" };
  }
  switch (account.sync.status) {
    case "ready":
      return { text: "Synced", tone: "fg", sub: last };
    case "partial":
      return { text: "Partially synced", tone: "warn", sub: last };
    case "error":
      return { text: "Sync failed", tone: "bad", sub: last };
    case "never":
      return { text: "Not synced yet", tone: "muted" };
  }
}

export function publishingCell(account: ConnectedIntegrationAccountStatus): Cell {
  if (needsReauthorization(account)) return { text: "Unavailable", tone: "warn" };
  if (account.publishingUnavailableReason) {
    return { text: "Unavailable", tone: "warn", sub: "Upload runtime unavailable" };
  }
  if (account.capabilities.publish) {
    return { text: "Granted", tone: "fg", sub: "Approval required" };
  }
  return { text: "Not granted", tone: "warn", sub: "Upload scope not granted" };
}

export const UNAVAILABLE_CELL: Cell = { text: "Unavailable", tone: "muted" };

export function accountNotices(account: ConnectedIntegrationAccountStatus): Notice[] {
  const notices: Notice[] = [];
  if (needsReauthorization(account)) {
    notices.push({
      tone: "warn",
      lead: "Authorization expired.",
      text: "Metrics and publishing stay paused until you reconnect.",
    });
  }
  if (account.sync.status === "error" && account.sync.warnings[0]) {
    notices.push({ tone: "bad", lead: "Sync failed.", text: account.sync.warnings[0] });
  } else if (account.sync.status === "partial" && account.sync.warnings[0]) {
    notices.push({ tone: "warn", lead: "Partially synced.", text: account.sync.warnings[0] });
  }
  if (account.publishingUnavailableReason) {
    notices.push({
      tone: "warn",
      lead: "Publishing unavailable.",
      text: account.publishingUnavailableReason,
    });
  }
  return notices;
}

export function accountLabel(
  account: ConnectedIntegrationAccountStatus,
  fallback: string
): { name: string; handle: string } {
  const { displayName, username } = account.account;
  const handle = username
    ? username.startsWith("@")
      ? username
      : `@${username}`
    : "Username unavailable";
  return { name: displayName || username || `${fallback} account`, handle };
}

export function attentionCount(providers: PublicIntegrationStatus[]): number {
  return providers.reduce(
    (sum, provider) =>
      sum +
      provider.accounts.filter(
        (account) => needsReauthorization(account) || account.sync.status === "error"
      ).length,
    0
  );
}

export function formatConnectionDate(value: string | null): string {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "Unknown";
  return dayMonthTime.format(parsed);
}

function lastSyncLine(account: ConnectedIntegrationAccountStatus): string {
  const at = account.sync.lastSuccessfulAt;
  if (!at) return "Never synced";
  const parsed = new Date(at);
  if (Number.isNaN(parsed.valueOf())) return "Last sync unknown";
  return `Last sync ${dayMonth.format(parsed)}`;
}
