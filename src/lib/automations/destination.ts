import type {
  ConnectedIntegrationAccountStatus,
  PublicIntegrationAccount,
  PublicIntegrationStatus,
} from "../integrations/types";

export type AutomationStatus = "active" | "paused" | "draft" | "needs_connection";
export type AutomationSocialDestination = "tiktok" | "instagram" | "youtube";
export type AutomationDestination = "manual" | AutomationSocialDestination;

export const AUTOMATION_SOCIAL_DESTINATIONS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube Shorts" },
] as const satisfies readonly {
  id: AutomationSocialDestination;
  label: string;
}[];

export function isAutomationSocialDestination(
  destination: AutomationDestination
): destination is AutomationSocialDestination {
  return destination !== "manual";
}

export function automationDestinationLabel(destination: AutomationDestination) {
  if (destination === "manual") return "Review queue";
  return (
    AUTOMATION_SOCIAL_DESTINATIONS.find((candidate) => candidate.id === destination)
      ?.label ?? destination
  );
}

export type AutomationDestinationReadiness = {
  ready: boolean;
  code:
    | "manual"
    | "ready"
    | "unavailable"
    | "not_configured"
    | "disconnected"
    | "missing_publish"
    | "reauthorization_required"
    | "account_unbound"
    | "account_changed";
  message: string;
  providerStatus: PublicIntegrationStatus | null;
  accountId: string | null;
  accountLabel: string | null;
};

export function integrationAccountLabel(
  account: PublicIntegrationAccount | null | undefined
) {
  if (!account) return null;
  const username = account.username?.trim() ?? "";
  const displayName = account.displayName?.trim() ?? "";
  const handle = username
    ? username.startsWith("@")
      ? username
      : `@${username}`
    : "";
  if (displayName && handle && displayName !== username) {
    return `${displayName} (${handle})`;
  }
  return displayName || handle || "Connected account";
}

export function findConnectedAccount(
  providerStatus: PublicIntegrationStatus | null | undefined,
  accountId: string | null | undefined
): ConnectedIntegrationAccountStatus | null {
  if (!providerStatus || !accountId) return null;
  return (
    providerStatus.accounts.find(
      (candidate) => candidate.account.id === accountId
    ) ?? null
  );
}

export function resolveAutomationDestination(
  destination: AutomationDestination,
  providers: readonly PublicIntegrationStatus[],
  expectedAccountId?: string | null
): AutomationDestinationReadiness {
  if (destination === "manual") {
    return {
      ready: true,
      code: "manual",
      message: "Review queue only; no social connection is required.",
      providerStatus: null,
      accountId: null,
      accountLabel: null,
    };
  }

  const providerStatus =
    providers.find((candidate) => candidate.provider === destination) ?? null;
  const fallbackName = automationDestinationLabel(destination);
  if (!providerStatus) {
    return {
      ready: false,
      code: "unavailable",
      message: `${fallbackName} connection status is unavailable. The provider handoff remains gated.`,
      providerStatus: null,
      accountId: null,
      accountLabel: null,
    };
  }

  if (providerStatus.configuration !== "ready") {
    return {
      ready: false,
      code: "not_configured",
      message: `${providerStatus.displayName} is not configured for this workspace.`,
      providerStatus,
      accountId: null,
      accountLabel: null,
    };
  }

  if (!providerStatus.connected || providerStatus.accounts.length === 0) {
    return {
      ready: false,
      code: "disconnected",
      message: `${providerStatus.displayName} is configured but no account is connected.`,
      providerStatus,
      accountId: null,
      accountLabel: null,
    };
  }

  const bound = findConnectedAccount(providerStatus, expectedAccountId);
  if (!bound) {
    if (expectedAccountId !== undefined && expectedAccountId !== null) {
      return {
        ready: false,
        code: "account_changed",
        message: `${providerStatus.displayName} no longer has the bound account connected. Review and explicitly rebind this automation before activation.`,
        providerStatus,
        accountId: null,
        accountLabel: null,
      };
    }
    if (expectedAccountId === null) {
      return {
        ready: false,
        code: "account_unbound",
        message: `${providerStatus.displayName} is connected, but this automation is not bound to one of its ${providerStatus.accounts.length} account${providerStatus.accounts.length === 1 ? "" : "s"} yet.`,
        providerStatus,
        accountId: providerStatus.accounts[0]?.account.id ?? null,
        accountLabel: integrationAccountLabel(
          providerStatus.accounts[0]?.account
        ),
      };
    }
    // No explicit binding yet: evaluate the connected accounts so the UI can
    // show publish-scope readiness instead of forcing a manual selection.
    const publishable = providerStatus.accounts.find(
      (candidate) => candidate.capabilities.publish
    );
    if (publishable) {
      return {
        ready: true,
        code: "ready",
        message: `${providerStatus.displayName} is connected as ${integrationAccountLabel(publishable.account)} with the required upload scope. This plan can be saved for review.`,
        providerStatus,
        accountId: publishable.account.id,
        accountLabel: integrationAccountLabel(publishable.account),
      };
    }
    const first = providerStatus.accounts[0];
    if (!first) {
      return {
        ready: false,
        code: "disconnected",
        message: `${providerStatus.displayName} is configured but no account is connected.`,
        providerStatus,
        accountId: null,
        accountLabel: null,
      };
    }
    return {
      ready: false,
      code: "missing_publish",
      message:
        first.publishingUnavailableReason ??
        `${providerStatus.displayName} is connected as ${integrationAccountLabel(first.account)}, but the upload scope is not granted.`,
      providerStatus,
      accountId: first.account.id,
      accountLabel: integrationAccountLabel(first.account),
    };
  }

  const accountLabel = integrationAccountLabel(bound.account);
  if (bound.authorization.status !== "healthy") {
    return {
      ready: false,
      code: "reauthorization_required",
      message:
        bound.authorization.status === "reauthorization_required"
          ? `${providerStatus.displayName} authorization for ${accountLabel} is no longer valid. Reconnect the account before using this plan.`
          : `${providerStatus.displayName} authorization for ${accountLabel} has not been verified yet. Sync or reconnect the account before using this plan.`,
      providerStatus,
      accountId: bound.account.id,
      accountLabel,
    };
  }
  if (!bound.capabilities.publish) {
    return {
      ready: false,
      code: "missing_publish",
      message:
        bound.publishingUnavailableReason ??
        `${providerStatus.displayName} is connected as ${accountLabel}, but the upload scope is not granted.`,
      providerStatus,
      accountId: bound.account.id,
      accountLabel,
    };
  }

  return {
    ready: true,
    code: "ready",
    message: `${providerStatus.displayName} is connected as ${accountLabel} with the required upload scope. This plan can be saved for review.`,
    providerStatus,
    accountId: bound.account.id,
    accountLabel,
  };
}

export function automationStatusAfterReview(
  destination: AutomationDestination,
  providers: readonly PublicIntegrationStatus[],
  options: {
    approvalRequired?: boolean;
    accountId?: string | null;
  } = {}
): AutomationStatus {
  if (destination === "manual") return "paused";
  if (options.approvalRequired === false) return "draft";
  const readiness = Object.prototype.hasOwnProperty.call(options, "accountId")
    ? resolveAutomationDestination(destination, providers, options.accountId)
    : resolveAutomationDestination(destination, providers);
  // Saving a plan never opts it into execution. The local review-draft
  // scheduler can be activated separately; provider publishing remains gated.
  return readiness.ready ? "paused" : "needs_connection";
}
