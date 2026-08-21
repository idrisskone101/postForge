import {
  deriveCapabilities,
  emptyCapabilities,
  getYouTubeComplianceUrls,
  INTEGRATION_PROVIDER_NAMES,
  isProviderConfigured,
  type IntegrationEnvironment,
} from "./config";
import { getIntegrationEncryptionKey } from "./crypto";
import {
  instagramMediaProbeExecutable,
  instagramMediaProbeIsAvailable,
} from "./instagram-media-probe";
import {
  youtubeComplianceStatus,
  youtubePolicyAcceptanceMatches,
} from "./youtube-policy";
import { dependencies, type IntegrationServiceDependencies } from "./runtime";
import {
  listProviderConnections,
} from "./store";
import {
  INTEGRATION_PROVIDERS,
  type ConnectedIntegrationAccountStatus,
  type DecryptedIntegrationConnection,
  type IntegrationProvider,
  type IntegrationsResponse,
  type PublicIntegrationStatus,
} from "./types";

export async function applyPublishingRuntimeReadiness(
  provider: IntegrationProvider,
  accountStatus: ConnectedIntegrationAccountStatus,
  env: IntegrationEnvironment
) {
  if (
    accountStatus.authorization.status === "healthy" &&
    accountStatus.capabilities.publish &&
    provider === "instagram" &&
    !(await instagramMediaProbeIsAvailable(
      instagramMediaProbeExecutable(env)
    ))
  ) {
    return {
      ...accountStatus,
      capabilities: { ...accountStatus.capabilities, publish: false },
      publishingUnavailableReason:
        "Instagram publishing requires an executable FFPROBE_PATH on the server before media can be verified.",
    };
  }
  return accountStatus;
}

export function unconnectedStatus(
  provider: IntegrationProvider,
  configured: boolean,
  complianceUrls: ReturnType<typeof getYouTubeComplianceUrls> = null
): PublicIntegrationStatus {
  return {
    provider,
    displayName: INTEGRATION_PROVIDER_NAMES[provider],
    configuration: configured ? "ready" : "not_configured",
    connected: false,
    accountCount: 0,
    accounts: [],
    youtubeCompliance: youtubeComplianceStatus(
      provider,
      complianceUrls,
      null
    ),
    connectUrl: `/api/integrations/${provider}/connect`,
  };
}

function unreadableAccountStatus(
  provider: IntegrationProvider,
  accountId: string
): ConnectedIntegrationAccountStatus {
  return {
    account: {
      id: accountId,
      username: null,
      displayName: null,
      avatarUrl: null,
      profileUrl: null,
    },
    grantedScopes: [],
    capabilities: emptyCapabilities(),
    connectedAt: null,
    updatedAt: null,
    authorization: {
      status: "reauthorization_required",
      lastCheckedAt: null,
    },
    sync: {
      status: "error",
      lastAttemptAt: null,
      lastSuccessfulAt: null,
      warnings: [
        "Stored credentials could not be read. Reconnect this account to replace them safely.",
      ],
    },
    publishingUnavailableReason: null,
  };
}

export function toAccountStatus(
  provider: IntegrationProvider,
  connection: DecryptedIntegrationConnection,
  policyConsentRequired: boolean
): ConnectedIntegrationAccountStatus {
  const storedAuthorization = connection.authorization ?? {
    status: "unknown" as const,
    lastCheckedAt: null,
  };
  const authorization = policyConsentRequired
    ? {
        status: "reauthorization_required" as const,
        lastCheckedAt: storedAuthorization.lastCheckedAt,
      }
    : storedAuthorization;
  const sync = {
    ...connection.sync,
    warnings: policyConsentRequired
      ? [
          "YouTube API access is disabled until the configured policies are accepted and the account is reconnected.",
          ...(connection.sync.warnings ?? []),
        ]
      : (connection.sync.warnings ?? []),
  };
  return {
    account: connection.account,
    grantedScopes: [...connection.grantedScopes],
    capabilities:
      authorization.status === "healthy" && !policyConsentRequired
        ? deriveCapabilities(provider, connection.grantedScopes)
        : emptyCapabilities(),
    connectedAt: connection.connectedAt,
    updatedAt: connection.updatedAt,
    authorization,
    sync,
    publishingUnavailableReason: null,
  };
}

export function toPublicIntegrationStatus(
  provider: IntegrationProvider,
  configured: boolean,
  connections: readonly DecryptedIntegrationConnection[],
  complianceUrls: ReturnType<typeof getYouTubeComplianceUrls> = null,
  unreadableAccountIds: readonly string[] = []
): PublicIntegrationStatus {
  const base = unconnectedStatus(provider, configured, complianceUrls);
  if (connections.length === 0 && unreadableAccountIds.length === 0) {
    return base;
  }
  const policyConsentRequired = (connection: DecryptedIntegrationConnection) =>
    provider === "youtube" &&
    !youtubePolicyAcceptanceMatches(
      connection.youtubePolicyAcceptance,
      complianceUrls
    );
  const accounts = buildAccountStatuses(
    provider,
    connections,
    policyConsentRequired,
    unreadableAccountIds
  );
  return {
    ...base,
    connected: true,
    accountCount: accounts.length,
    accounts,
  };
}

function buildAccountStatuses(
  provider: IntegrationProvider,
  connections: readonly DecryptedIntegrationConnection[],
  policyConsentRequired: (connection: DecryptedIntegrationConnection) => boolean,
  unreadableAccountIds: readonly string[]
): ConnectedIntegrationAccountStatus[] {
  return [
    ...connections.map((connection) =>
      toAccountStatus(
        provider,
        connection,
        policyConsentRequired(connection)
      )
    ),
    ...unreadableAccountIds.map((accountId) =>
      unreadableAccountStatus(provider, accountId)
    ),
  ];
}

export async function getPublicIntegrationStatus(
  provider: IntegrationProvider,
  input: IntegrationServiceDependencies = {}
) {
  const deps = dependencies(input);
  const complianceUrls =
    provider === "youtube" ? getYouTubeComplianceUrls(deps.env) : null;
  if (!isProviderConfigured(provider, deps.env)) {
    return unconnectedStatus(provider, false, complianceUrls);
  }
  let encryptionKey: Buffer;
  try {
    encryptionKey = getIntegrationEncryptionKey(deps.env);
  } catch {
    return unconnectedStatus(provider, false, complianceUrls);
  }
  let connections: DecryptedIntegrationConnection[] = [];
  let unreadableAccountIds: string[] = [];
  try {
    ({ connections, unreadableAccountIds } = await listProviderConnections(
      provider,
      encryptionKey,
      deps.storage
    ));
  } catch {
    return unconnectedStatus(provider, true, complianceUrls);
  }
  const accounts = await Promise.all(
    buildAccountStatuses(
      provider,
      connections,
      (connection) =>
        provider === "youtube" &&
        !youtubePolicyAcceptanceMatches(
          connection.youtubePolicyAcceptance,
          complianceUrls
        ),
      unreadableAccountIds
    ).map((status) => applyPublishingRuntimeReadiness(provider, status, deps.env))
  );
  return {
    ...unconnectedStatus(provider, true, complianceUrls),
    connected: accounts.length > 0,
    accountCount: accounts.length,
    accounts,
  };
}

export async function getIntegrationsResponse(
  input: IntegrationServiceDependencies = {}
): Promise<IntegrationsResponse> {
  return {
    providers: await Promise.all(
      INTEGRATION_PROVIDERS.map((provider) =>
        getPublicIntegrationStatus(provider, input)
      )
    ),
  };
}
