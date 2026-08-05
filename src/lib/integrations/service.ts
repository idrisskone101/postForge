import {
  deriveCapabilities,
  emptyCapabilities,
  getProviderOAuthConfig,
  getYouTubeComplianceUrls,
  INTEGRATION_PROVIDER_NAMES,
  isProviderConfigured,
  type IntegrationEnvironment,
} from "./config";
import { getIntegrationEncryptionKey } from "./crypto";
import { createSignedPublishMediaUrl } from "./publish-media";
import { getIntegrationProviderAdapter } from "./providers";
import {
  instagramMediaProbeExecutable,
  instagramMediaProbeIsAvailable,
} from "./instagram-media-probe";
import type { ProviderFetch } from "./providers/types";
import { IntegrationProviderError } from "./providers/http";
import {
  IntegrationMediaValidationError,
  IntegrationPublicationAmbiguousError,
  IntegrationPublicationTerminalError,
  publishProviderShort,
  queryTikTokCreatorPublishingInfo,
  queryTikTokPublishStatus,
  queryYouTubePublishStatus,
  resumeInstagramReel,
  resumeYouTubeUpload,
  type ProviderPublicationStatus,
  type ProviderPublishProgress,
  type ProviderPublishingDependencies,
  type ProviderShortPublishResult,
  type ProviderVisibility,
  type ShortPublishMedia,
  type TikTokCreatorPublishingInfo,
  type TikTokPublishSettings,
  type YouTubePublishSettings,
} from "./publishing";
import {
  beginProviderMutation,
  commitProviderMutation,
  consumeOAuthStateRecord,
  deleteAllYouTubePublishSessions,
  deleteProviderMetrics,
  deleteYouTubePublishSession,
  deleteIntegrationConnection,
  listProviderConnections,
  listProviderMetricRecords,
  prismaIntegrationStorage,
  readIntegrationConnection,
  readYouTubePublishSession,
  pruneExpiredOAuthStateRecords,
  saveIntegrationConnection,
  saveOAuthStateRecord,
  saveProviderMetrics,
  saveYouTubePublishSession,
  type IntegrationStorage,
  type StoredOAuthStateRecord,
  type StoredProviderMetrics,
} from "./store";
import { createOAuthState, verifyOAuthState } from "./state";
import {
  INTEGRATION_PROVIDERS,
  type ConnectedIntegrationAccountStatus,
  type DecryptedIntegrationConnection,
  type IntegrationPerformanceResponse,
  type IntegrationProvider,
  type IntegrationSyncResponse,
  type IntegrationsResponse,
  type PublicYouTubeCompliance,
  type PublicIntegrationStatus,
  type YouTubePolicyAcceptance,
} from "./types";
import {
  assertProviderHasNoUnresolvedPublication,
  assertReconnectCompatibleWithPublications,
  UnresolvedPublicationConflictError,
  unresolvedPublications,
  withLockedAutomationRecords,
} from "../publication-lifecycle";
import type { AutomationRecord } from "../automations";
import {
  scrubYouTubeAutomationProviderData,
  youtubeApiDataIsFresh,
} from "./retention-records";

export class IntegrationNotConfiguredError extends Error {
  constructor() {
    super("This integration is not configured");
    this.name = "IntegrationNotConfiguredError";
  }
}

export class IntegrationNotConnectedError extends Error {
  constructor() {
    super("This integration is not connected");
    this.name = "IntegrationNotConnectedError";
  }
}

export class IntegrationSyncError extends Error {
  constructor() {
    super("The integration could not be synced");
    this.name = "IntegrationSyncError";
  }
}

export class IntegrationDisconnectError extends Error {
  constructor() {
    super(
      "The provider did not confirm revocation; the local connection was retained so disconnect can be retried"
    );
    this.name = "IntegrationDisconnectError";
  }
}

export class IntegrationMutationSupersededError extends Error {
  constructor() {
    super("A newer integration change superseded this request");
    this.name = "IntegrationMutationSupersededError";
  }
}

export class IntegrationAuthorizationUnhealthyError extends Error {
  constructor() {
    super("Provider authorization must be healthy before publishing");
    this.name = "IntegrationAuthorizationUnhealthyError";
  }
}

export class IntegrationPublishScopeError extends Error {
  constructor() {
    super("The connected account has not granted the provider publishing scope");
    this.name = "IntegrationPublishScopeError";
  }
}

export class IntegrationAccountBindingError extends Error {
  constructor() {
    super("The connected provider account no longer matches this automation");
    this.name = "IntegrationAccountBindingError";
  }
}

export class YouTubePolicyConsentRequiredError extends Error {
  constructor() {
    super(
      "Review and accept the configured PostForge policies and YouTube Terms of Service, then reconnect YouTube"
    );
    this.name = "YouTubePolicyConsentRequiredError";
  }
}

export function youtubeProviderDataIsFresh(syncedAt: string, now: Date) {
  return youtubeApiDataIsFresh(syncedAt, now);
}

export type IntegrationServiceDependencies = {
  env?: IntegrationEnvironment;
  storage?: IntegrationStorage;
  fetch?: ProviderFetch;
  now?: Date;
  wait?: ProviderPublishingDependencies["wait"];
  /** Test/in-memory override; production always reads the locked server record. */
  automationRecords?: AutomationRecord[];
  /** Explicit UI acceptance used only to mint a consent-bearing OAuth state. */
  youtubePolicyConsent?: boolean;
  /** Server-owned state record returned by consumeProviderOAuthState. */
  consumedOAuthState?: StoredOAuthStateRecord;
};

function dependencies(input: IntegrationServiceDependencies = {}) {
  return {
    env: input.env ?? process.env,
    storage: input.storage ?? prismaIntegrationStorage,
    fetch: input.fetch ?? fetch,
    now: input.now ?? new Date(),
    wait: input.wait,
    automationRecords: input.automationRecords,
    youtubePolicyConsent: input.youtubePolicyConsent,
    consumedOAuthState: input.consumedOAuthState,
  };
}

async function withIntegrationPublicationRecords<R>(
  runtime: ReturnType<typeof providerRuntime>,
  operation: (records: AutomationRecord[]) => Promise<R> | R
) {
  if (runtime.automationRecords) return operation(runtime.automationRecords);
  if (runtime.storage !== prismaIntegrationStorage) return operation([]);
  return withLockedAutomationRecords(async (records) => ({
    result: await operation(records),
  }));
}

async function scrubYouTubeAutomationRecords(
  runtime: ReturnType<typeof dependencies>,
  now: Date,
  accountId?: string
) {
  const scrub = (records: AutomationRecord[]) =>
    scrubYouTubeAutomationProviderData(records, {
      now,
      scrubAccountBindings: true,
      disconnectedAccountId: accountId,
    });
  if (runtime.automationRecords) {
    const scrubbed = scrub(runtime.automationRecords);
    runtime.automationRecords.splice(
      0,
      runtime.automationRecords.length,
      ...scrubbed.records
    );
    return scrubbed.changed;
  }
  if (runtime.storage !== prismaIntegrationStorage) return 0;
  return withLockedAutomationRecords(async (records) => {
    const scrubbed = scrub(records);
    return {
      records: scrubbed.records,
      result: scrubbed.changed,
    };
  });
}

const YOUTUBE_TERMS_OF_SERVICE_URL =
  "https://www.youtube.com/t/terms" as const;

function youtubePolicyAcceptanceMatches(
  acceptance: YouTubePolicyAcceptance | null | undefined,
  complianceUrls: ReturnType<typeof getYouTubeComplianceUrls>
) {
  if (!acceptance || !complianceUrls) return false;
  return (
    acceptance.version === 1 &&
    Number.isFinite(new Date(acceptance.acceptedAt).getTime()) &&
    acceptance.privacyPolicyUrl === complianceUrls.privacyPolicy &&
    acceptance.termsUrl === complianceUrls.terms &&
    acceptance.dataDeletionUrl === complianceUrls.dataDeletion &&
    acceptance.youtubeTermsOfServiceUrl === YOUTUBE_TERMS_OF_SERVICE_URL
  );
}

function youtubeConsentStateIsCurrent(
  record: StoredOAuthStateRecord | undefined,
  complianceUrls: ReturnType<typeof getYouTubeComplianceUrls>,
  now: Date
) {
  if (
    !record ||
    record.version !== 1 ||
    record.provider !== "youtube" ||
    !youtubePolicyAcceptanceMatches(
      record.youtubePolicyAcceptance,
      complianceUrls
    )
  ) {
    return false;
  }
  const expiresAt = new Date(record.expiresAt).getTime();
  const acceptedAt = new Date(
    record.youtubePolicyAcceptance!.acceptedAt
  ).getTime();
  return (
    Number.isFinite(expiresAt) &&
    expiresAt >= now.getTime() &&
    acceptedAt <= expiresAt
  );
}

function youtubeComplianceStatus(
  provider: IntegrationProvider,
  complianceUrls: ReturnType<typeof getYouTubeComplianceUrls>,
  connection: DecryptedIntegrationConnection | null
): PublicYouTubeCompliance | null {
  if (provider !== "youtube" || !complianceUrls) return null;
  const consentAccepted = youtubePolicyAcceptanceMatches(
    connection?.youtubePolicyAcceptance,
    complianceUrls
  );
  return {
    privacyPolicyUrl: complianceUrls.privacyPolicy,
    termsUrl: complianceUrls.terms,
    dataDeletionUrl: complianceUrls.dataDeletion,
    youtubeTermsOfServiceUrl: YOUTUBE_TERMS_OF_SERVICE_URL,
    consentAccepted,
    acceptedAt: consentAccepted
      ? connection?.youtubePolicyAcceptance?.acceptedAt ?? null
      : null,
  };
}

function assertYouTubePolicyConsent(
  provider: IntegrationProvider,
  connection: DecryptedIntegrationConnection,
  complianceUrls: ReturnType<typeof getYouTubeComplianceUrls>
) {
  if (
    provider === "youtube" &&
    !youtubePolicyAcceptanceMatches(
      connection.youtubePolicyAcceptance,
      complianceUrls
    )
  ) {
    throw new YouTubePolicyConsentRequiredError();
  }
}

async function applyPublishingRuntimeReadiness(
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

function unconnectedStatus(
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

function toAccountStatus(
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

function providerRuntime(
  provider: IntegrationProvider,
  input: IntegrationServiceDependencies = {}
) {
  const deps = dependencies(input);
  const config = getProviderOAuthConfig(provider, deps.env);
  if (!config) throw new IntegrationNotConfiguredError();
  let encryptionKey: Buffer;
  try {
    encryptionKey = getIntegrationEncryptionKey(deps.env);
  } catch {
    throw new IntegrationNotConfiguredError();
  }
  return {
    ...deps,
    config,
    encryptionKey,
    adapter: getIntegrationProviderAdapter(provider),
  };
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

export async function beginOAuthConnection(
  provider: IntegrationProvider,
  input: IntegrationServiceDependencies = {}
) {
  const runtime = providerRuntime(provider, input);
  let youtubePolicyAcceptance: YouTubePolicyAcceptance | undefined;
  if (provider === "youtube") {
    const complianceUrls = runtime.config.youtubeComplianceUrls;
    if (!runtime.youtubePolicyConsent || !complianceUrls) {
      throw new YouTubePolicyConsentRequiredError();
    }
    youtubePolicyAcceptance = {
      version: 1,
      acceptedAt: runtime.now.toISOString(),
      privacyPolicyUrl: complianceUrls.privacyPolicy,
      termsUrl: complianceUrls.terms,
      dataDeletionUrl: complianceUrls.dataDeletion,
      youtubeTermsOfServiceUrl: YOUTUBE_TERMS_OF_SERVICE_URL,
    };
  }
  const created = createOAuthState(provider, runtime.encryptionKey, {
    now: runtime.now,
  });
  await pruneExpiredOAuthStateRecords(runtime.now, runtime.storage);
  await saveOAuthStateRecord(
    created.nonceHash,
    {
      ...created.record,
      ...(youtubePolicyAcceptance ? { youtubePolicyAcceptance } : {}),
    },
    runtime.storage
  );
  return {
    authorizationUrl: runtime.adapter.buildAuthorizationUrl(
      runtime.config,
      created.state
    ),
    state: created,
  };
}

export async function consumeProviderOAuthState(
  provider: IntegrationProvider,
  state: string | null,
  cookieValue: string | null,
  input: IntegrationServiceDependencies = {}
) {
  const runtime = providerRuntime(provider, input);
  const verified = verifyOAuthState({
    provider,
    state,
    cookieValue,
    signingKey: runtime.encryptionKey,
    now: runtime.now,
  });
  const isSingleUse = await consumeOAuthStateRecord(
    verified.nonceHash,
    provider,
    runtime.now,
    runtime.storage
  );
  if (!isSingleUse) {
    throw new Error("OAuth state has already been used");
  }
  if (
    provider === "youtube" &&
    !youtubePolicyAcceptanceMatches(
      isSingleUse.youtubePolicyAcceptance,
      runtime.config.youtubeComplianceUrls
    )
  ) {
    throw new YouTubePolicyConsentRequiredError();
  }
  return isSingleUse;
}

export async function completeOAuthConnection(
  provider: IntegrationProvider,
  code: string,
  input: IntegrationServiceDependencies = {}
) {
  const runtime = providerRuntime(provider, input);
  const youtubePolicyAcceptance =
    provider === "youtube"
      ? youtubeConsentStateIsCurrent(
          runtime.consumedOAuthState,
          runtime.config.youtubeComplianceUrls,
          runtime.now
        )
        ? runtime.consumedOAuthState?.youtubePolicyAcceptance ?? null
        : null
      : null;
  if (provider === "youtube" && !youtubePolicyAcceptance) {
    throw new YouTubePolicyConsentRequiredError();
  }
  const mutation = await beginProviderMutation(
    provider,
    async () => null,
    runtime.storage
  );
  const tokens = await runtime.adapter.exchangeCode(runtime.config, code, {
    fetch: runtime.fetch,
    now: runtime.now,
  });
  const account = await runtime.adapter.fetchAccount(
    runtime.config,
    tokens.accessToken,
    { fetch: runtime.fetch, now: runtime.now }
  );
  const scopes = [...tokens.grantedScopes];
  if (
    provider === "instagram" &&
    !scopes.includes("instagram_business_basic")
  ) {
    // A successful /me response proves the basic permission even when the
    // token response omits its permissions field. Elevated scopes stay false.
    scopes.push("instagram_business_basic");
  }
  const now = runtime.now.toISOString();
  const connection: DecryptedIntegrationConnection = {
    version: 1,
    provider,
    account,
    grantedScopes: scopes,
    tokens: { ...tokens, grantedScopes: scopes },
    connectedAt: now,
    updatedAt: now,
    authorization: {
      status: "healthy",
      lastCheckedAt: now,
    },
    sync: {
      status: "never",
      lastAttemptAt: null,
      lastSuccessfulAt: null,
      warnings: [],
    },
    youtubePolicyAcceptance,
  };
  const persistCompatibleConnection = () =>
    withIntegrationPublicationRecords(runtime, async (records) => {
      const existing = await readIntegrationConnection(
        provider,
        account.id,
        runtime.encryptionKey,
        runtime.storage
      );
      // Replacing the same account: the new grant must remain compatible with
      // any unresolved publications bound to that account.
      if (existing) {
        assertReconnectCompatibleWithPublications(
          records,
          provider,
          account.id,
          deriveCapabilities(provider, scopes).publish
        );
      } else if (
        unresolvedPublications(records).some(
          (publication) => publication.provider === provider && publication.accountId === account.id
        )
      ) {
        // A brand-new account is not blocked by unresolved publications bound
        // to other connected accounts; only an unresolved publication that
        // somehow references this exact new account id is a conflict.
        assertReconnectCompatibleWithPublications(
          records,
          provider,
          account.id,
          deriveCapabilities(provider, scopes).publish
        );
      }
      return commitProviderMutation(
        provider,
        mutation.revision,
        async (lockedStorage) => {
          await saveIntegrationConnection(
            connection,
            runtime.encryptionKey,
            lockedStorage
          );
          await deleteProviderMetrics(provider, account.id, lockedStorage);
        },
        runtime.storage
      );
    });
  let committed: Awaited<ReturnType<typeof persistCompatibleConnection>>;
  try {
    committed = await persistCompatibleConnection();
  } catch (cause) {
    if (cause instanceof UnresolvedPublicationConflictError) {
      try {
        await runtime.adapter.revokeAccess(
          runtime.config,
          connection.tokens,
          connection.account,
          { fetch: runtime.fetch, now: runtime.now }
        );
      } catch {
        // The incompatible grant was never persisted. Keep the old local
        // connection so the unresolved publication remains recoverable.
      }
    }
    throw cause;
  }
  if (!committed.committed) {
    // The callback obtained a provider token after a newer disconnect won the
    // durable revision. Revoke that uncommitted grant best-effort so it cannot
    // become an orphaned provider-side connection, but never recreate local
    // state just to retain it.
    try {
      await runtime.adapter.revokeAccess(
        runtime.config,
        connection.tokens,
        connection.account,
        { fetch: runtime.fetch, now: runtime.now }
      );
    } catch {
      // The request still remains superseded. Provider cleanup can be retried
      // only by reconnecting and explicitly disconnecting the resulting grant.
    }
    throw new IntegrationMutationSupersededError();
  }
  // Keep the OAuth callback bounded to token exchange and account discovery.
  // Providers such as Instagram can require one insight request per post, so
  // the explicit sync endpoint owns metrics ingestion after connection.
  return {
    ...unconnectedStatus(provider, true, runtime.config.youtubeComplianceUrls),
    ...(provider === "youtube"
      ? {
          youtubeCompliance: youtubeComplianceStatus(
            provider,
            runtime.config.youtubeComplianceUrls,
            connection
          ),
        }
      : {}),
    connected: true,
    accountCount: 1,
    accounts: [
      await applyPublishingRuntimeReadiness(
        provider,
        toAccountStatus(
          provider,
          connection,
          provider === "youtube" &&
            !youtubePolicyAcceptanceMatches(
              connection.youtubePolicyAcceptance,
              runtime.config.youtubeComplianceUrls
            )
        ),
        runtime.env
      ),
    ],
  };
}

async function refreshIfNeeded(
  connection: DecryptedIntegrationConnection,
  runtime: ReturnType<typeof providerRuntime>
) {
  const expiresAt = connection.tokens.expiresAt
    ? new Date(connection.tokens.expiresAt).getTime()
    : Number.POSITIVE_INFINITY;
  if (expiresAt > runtime.now.getTime() + 60_000) return connection;

  const refreshed = await runtime.adapter.refreshTokens(
    runtime.config,
    connection.tokens,
    { fetch: runtime.fetch, now: runtime.now }
  );
  const next: DecryptedIntegrationConnection = {
    ...connection,
    grantedScopes:
      refreshed.grantedScopes.length > 0
        ? refreshed.grantedScopes
        : connection.grantedScopes,
    tokens: refreshed,
    updatedAt: runtime.now.toISOString(),
    authorization: {
      status: "healthy",
      lastCheckedAt: runtime.now.toISOString(),
    },
  };
  return next;
}

function isAuthorizationFailure(cause: unknown) {
  return (
    (cause instanceof IntegrationPublicationAmbiguousError &&
      cause.authorizationFailure) ||
    (cause instanceof IntegrationProviderError &&
      cause.kind === "authorization") ||
    (cause instanceof Error &&
      /refresh token is missing|invalid[_ -]?grant|invalid[_ -]?token/i.test(
        cause.message
      ))
  );
}

export async function getTikTokPublishingPreflight(
  expectedAccountId: string,
  dependenciesInput: IntegrationServiceDependencies = {}
): Promise<{
  account: DecryptedIntegrationConnection["account"];
  creator: TikTokCreatorPublishingInfo;
  directPostApprovalAcknowledged: boolean;
}> {
  const normalizedAccountId = expectedAccountId.trim();
  if (!normalizedAccountId) throw new IntegrationAccountBindingError();
  const runtime = providerRuntime("tiktok", dependenciesInput);
  const mutation = await beginProviderMutation(
    "tiktok",
    (lockedStorage) =>
      readIntegrationConnection(
        "tiktok",
        normalizedAccountId,
        runtime.encryptionKey,
        lockedStorage
      ),
    runtime.storage
  );
  const existing = mutation.snapshot;
  if (!existing) throw new IntegrationNotConnectedError();
  if (existing.authorization.status !== "healthy") {
    throw new IntegrationAuthorizationUnhealthyError();
  }

  let current = existing;
  try {
    current = await refreshIfNeeded(existing, runtime);
    if (!deriveCapabilities("tiktok", current.grantedScopes).publish) {
      throw new IntegrationPublishScopeError();
    }
    const [account, creator] = await Promise.all([
      runtime.adapter.fetchAccount(
        runtime.config,
        current.tokens.accessToken,
        { fetch: runtime.fetch, now: runtime.now }
      ),
      queryTikTokCreatorPublishingInfo(
        current.tokens.accessToken,
        runtime.fetch
      ),
    ]);
    const checkedAt = runtime.now.toISOString();
    current = {
      ...current,
      account,
      updatedAt: checkedAt,
      authorization: { status: "healthy", lastCheckedAt: checkedAt },
    };
    const committed = await commitProviderMutation(
      "tiktok",
      mutation.revision,
      (lockedStorage) =>
        saveIntegrationConnection(
          current,
          runtime.encryptionKey,
          lockedStorage
        ),
      runtime.storage
    );
    if (!committed.committed) {
      throw new IntegrationMutationSupersededError();
    }
    if (account.id !== normalizedAccountId) {
      throw new IntegrationAccountBindingError();
    }
    return {
      account,
      creator,
      directPostApprovalAcknowledged:
        runtime.config.tiktokDirectPostApprovalAcknowledged,
    };
  } catch (cause) {
    if (
      cause instanceof IntegrationMutationSupersededError ||
      cause instanceof IntegrationPublishScopeError ||
      cause instanceof IntegrationAccountBindingError
    ) {
      throw cause;
    }
    if (isAuthorizationFailure(cause)) {
      const failed: DecryptedIntegrationConnection = {
        ...current,
        updatedAt: runtime.now.toISOString(),
        authorization: {
          status: "reauthorization_required",
          lastCheckedAt: runtime.now.toISOString(),
        },
      };
      const committed = await commitProviderMutation(
        "tiktok",
        mutation.revision,
        (lockedStorage) =>
          saveIntegrationConnection(
            failed,
            runtime.encryptionKey,
            lockedStorage
          ),
        runtime.storage
      );
      if (!committed.committed) {
        throw new IntegrationMutationSupersededError();
      }
      throw new IntegrationAuthorizationUnhealthyError();
    }
    throw cause;
  }
}

export async function publishIntegrationShort(
  provider: IntegrationProvider,
  input: {
    expectedAccountId: string;
    attemptId: string;
    media: ShortPublishMedia;
    caption: string;
    tiktokSettings?: TikTokPublishSettings;
    youtubeSettings?: YouTubePublishSettings;
    onProgress?: (progress: ProviderPublishProgress) => Promise<void>;
  },
  dependenciesInput: IntegrationServiceDependencies = {}
): Promise<ProviderShortPublishResult> {
  const expectedAccountId = input.expectedAccountId.trim();
  const attemptId = input.attemptId.trim();
  if (!expectedAccountId) throw new IntegrationAccountBindingError();
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(attemptId)) {
    throw new IntegrationMediaValidationError("Publish attempt id is invalid");
  }

  const runtime = providerRuntime(provider, dependenciesInput);
  const mutation = await beginProviderMutation(
    provider,
    (lockedStorage) =>
      readIntegrationConnection(
        provider,
        expectedAccountId,
        runtime.encryptionKey,
        lockedStorage
      ),
    runtime.storage
  );
  const existing = mutation.snapshot;
  if (!existing) throw new IntegrationNotConnectedError();
  assertYouTubePolicyConsent(
    provider,
    existing,
    runtime.config.youtubeComplianceUrls
  );
  if (existing.authorization.status !== "healthy") {
    throw new IntegrationAuthorizationUnhealthyError();
  }

  let current = existing;
  try {
    current = await refreshIfNeeded(existing, runtime);
    if (!deriveCapabilities(provider, current.grantedScopes).publish) {
      throw new IntegrationPublishScopeError();
    }
    const account = await runtime.adapter.fetchAccount(
      runtime.config,
      current.tokens.accessToken,
      { fetch: runtime.fetch, now: runtime.now }
    );
    const checkedAt = runtime.now.toISOString();
    current = {
      ...current,
      account,
      updatedAt: checkedAt,
      authorization: { status: "healthy", lastCheckedAt: checkedAt },
    };
    const committed = await commitProviderMutation(
      provider,
      mutation.revision,
      (lockedStorage) =>
        saveIntegrationConnection(
          current,
          runtime.encryptionKey,
          lockedStorage
        ),
      runtime.storage
    );
    if (!committed.committed) {
      throw new IntegrationMutationSupersededError();
    }
    if (account.id !== expectedAccountId) {
      throw new IntegrationAccountBindingError();
    }
  } catch (cause) {
    if (
      cause instanceof IntegrationMutationSupersededError ||
      cause instanceof IntegrationPublishScopeError ||
      cause instanceof IntegrationAccountBindingError
    ) {
      throw cause;
    }
    if (isAuthorizationFailure(cause)) {
      const failed: DecryptedIntegrationConnection = {
        ...current,
        updatedAt: runtime.now.toISOString(),
        authorization: {
          status: "reauthorization_required",
          lastCheckedAt: runtime.now.toISOString(),
        },
      };
      const committed = await commitProviderMutation(
        provider,
        mutation.revision,
        (lockedStorage) =>
          saveIntegrationConnection(
            failed,
            runtime.encryptionKey,
            lockedStorage
          ),
        runtime.storage
      );
      if (!committed.committed) {
        throw new IntegrationMutationSupersededError();
      }
      throw new IntegrationAuthorizationUnhealthyError();
    }
    throw cause;
  }

  try {
    const media =
      provider === "youtube"
        ? input.media
        : {
            ...input.media,
            publicUrl: createSignedPublishMediaUrl({
              publicUrl: runtime.config.publicUrl,
              assetId: input.media.id,
              provider,
              encryptionKey: runtime.encryptionKey,
              now: runtime.now,
            }),
          };
    const result = await publishProviderShort(
      {
        provider,
        config: runtime.config,
        accessToken: current.tokens.accessToken,
        account: current.account,
        media,
        caption: input.caption,
        tiktokSettings: input.tiktokSettings,
        youtubeSettings: input.youtubeSettings,
      },
      {
        fetch: runtime.fetch,
        wait: runtime.wait,
        onProgress: input.onProgress,
        onRecoverySession:
          provider === "youtube"
            ? (uploadUrl) =>
                saveYouTubePublishSession(
                  attemptId,
                  uploadUrl,
                  runtime.encryptionKey,
                  runtime.storage
                )
            : undefined,
      }
    );
    if (provider === "youtube" && result.externalId) {
      await deleteYouTubePublishSession(attemptId, runtime.storage);
    }
    return result;
  } catch (cause) {
    if (cause instanceof IntegrationPublicationTerminalError) {
      if (provider === "youtube") {
        await deleteYouTubePublishSession(attemptId, runtime.storage);
      }
      throw cause;
    }
    if (isAuthorizationFailure(cause)) {
      const authorizationMutation = await beginProviderMutation(
        provider,
        (lockedStorage) =>
          readIntegrationConnection(
            provider,
            expectedAccountId,
            runtime.encryptionKey,
            lockedStorage
          ),
        runtime.storage
      );
      const latest = authorizationMutation.snapshot;
      if (
        !latest ||
        latest.account.id !== expectedAccountId ||
        latest.tokens.accessToken !== current.tokens.accessToken
      ) {
        throw new IntegrationMutationSupersededError();
      }
      const failed: DecryptedIntegrationConnection = {
        ...latest,
        updatedAt: runtime.now.toISOString(),
        authorization: {
          status: "reauthorization_required",
          lastCheckedAt: runtime.now.toISOString(),
        },
      };
      const committed = await commitProviderMutation(
        provider,
        authorizationMutation.revision,
        (lockedStorage) =>
          saveIntegrationConnection(
            failed,
            runtime.encryptionKey,
            lockedStorage
          ),
        runtime.storage
      );
      if (!committed.committed) {
        throw new IntegrationMutationSupersededError();
      }
      throw new IntegrationAuthorizationUnhealthyError();
    }
    throw cause;
  }
}

export async function refreshIntegrationPublicationStatus(
  provider: IntegrationProvider,
  input: {
    expectedAccountId: string;
    attemptId: string;
    externalId: string | null;
    media?: ShortPublishMedia;
    visibility?: ProviderVisibility;
    providerStatus?: string | null;
    onProgress?: (progress: ProviderPublishProgress) => Promise<void>;
  },
  dependenciesInput: IntegrationServiceDependencies = {}
): Promise<ProviderPublicationStatus> {
  const expectedAccountId = input.expectedAccountId.trim();
  const externalId = input.externalId?.trim() ?? "";
  if (!expectedAccountId) throw new IntegrationAccountBindingError();
  if (!externalId && provider !== "youtube") {
    throw new IntegrationMediaValidationError(
      "The provider did not return an id that can be checked"
    );
  }
  const runtime = providerRuntime(provider, dependenciesInput);
  const mutation = await beginProviderMutation(
    provider,
    (lockedStorage) =>
      readIntegrationConnection(
        provider,
        expectedAccountId,
        runtime.encryptionKey,
        lockedStorage
      ),
    runtime.storage
  );
  const existing = mutation.snapshot;
  if (!existing) throw new IntegrationNotConnectedError();
  assertYouTubePolicyConsent(
    provider,
    existing,
    runtime.config.youtubeComplianceUrls
  );
  if (existing.authorization.status !== "healthy") {
    throw new IntegrationAuthorizationUnhealthyError();
  }
  let current = existing;
  try {
    current = await refreshIfNeeded(existing, runtime);
    if (!deriveCapabilities(provider, current.grantedScopes).publish) {
      throw new IntegrationPublishScopeError();
    }
    const account = await runtime.adapter.fetchAccount(
      runtime.config,
      current.tokens.accessToken,
      { fetch: runtime.fetch, now: runtime.now }
    );
    const checkedAt = runtime.now.toISOString();
    current = {
      ...current,
      account,
      updatedAt: checkedAt,
      authorization: { status: "healthy", lastCheckedAt: checkedAt },
    };
    const committed = await commitProviderMutation(
      provider,
      mutation.revision,
      (lockedStorage) =>
        saveIntegrationConnection(
          current,
          runtime.encryptionKey,
          lockedStorage
        ),
      runtime.storage
    );
    if (!committed.committed) {
      throw new IntegrationMutationSupersededError();
    }
    if (account.id !== expectedAccountId) {
      throw new IntegrationAccountBindingError();
    }
    if (provider === "youtube" && !externalId) {
      if (!input.media) {
        throw new IntegrationMediaValidationError(
          "The approved video is unavailable for YouTube upload recovery"
        );
      }
      const uploadUrl = await readYouTubePublishSession(
        input.attemptId,
        runtime.encryptionKey,
        runtime.storage
      );
      if (!uploadUrl) {
        throw new IntegrationMediaValidationError(
          "The YouTube resumable upload session is unavailable"
        );
      }
      const result = await resumeYouTubeUpload(
        {
          uploadUrl,
          accessToken: current.tokens.accessToken,
          media: input.media,
          visibility:
            input.visibility === "unlisted" || input.visibility === "public"
              ? input.visibility
              : "private",
          priorOutcomeUnknown:
            input.providerStatus === "UPLOAD_OUTCOME_UNKNOWN" ||
            input.providerStatus === "UPLOAD_REQUEST_SENT",
        },
        {
          fetch: runtime.fetch,
          wait: runtime.wait,
          onProgress: input.onProgress,
        }
      );
      if (result.externalId) {
        await deleteYouTubePublishSession(input.attemptId, runtime.storage);
      }
      return {
        status: "processing",
        providerStatus: result.providerStatus,
        visibility: result.visibility,
        providerVisibility: result.providerVisibility,
      };
    }
    if (provider === "instagram") {
      if (
        input.providerStatus === "PUBLISH_REQUEST_SENT" ||
        input.providerStatus === "PUBLISH_OUTCOME_UNKNOWN"
      ) {
        throw new IntegrationPublicationAmbiguousError(
          "Instagram did not confirm the media_publish outcome. Verify the Reel on the connected account; automatic resubmission is disabled to prevent a duplicate."
        );
      }
      const result = await resumeInstagramReel(
        {
          config: runtime.config,
          accessToken: current.tokens.accessToken,
          account: current.account,
          containerId: externalId,
        },
        {
          fetch: runtime.fetch,
          wait: runtime.wait,
          onProgress: input.onProgress,
        }
      );
      return {
        status: result.status === "published" ? "published" : "processing",
        providerStatus: result.providerStatus,
        visibility: result.visibility,
        providerVisibility: result.providerVisibility,
      };
    }
    return provider === "tiktok"
      ? queryTikTokPublishStatus(
          current.tokens.accessToken,
          externalId,
          runtime.fetch
        )
      : queryYouTubePublishStatus(
          current.tokens.accessToken,
          externalId,
          runtime.fetch
        );
  } catch (cause) {
    if (cause instanceof IntegrationPublicationTerminalError) {
      if (provider === "youtube") {
        await deleteYouTubePublishSession(input.attemptId, runtime.storage);
      }
      return { status: "failed", providerStatus: "FAILED" };
    }
    if (
      cause instanceof IntegrationMutationSupersededError ||
      cause instanceof IntegrationPublishScopeError ||
      cause instanceof IntegrationAccountBindingError ||
      cause instanceof IntegrationMediaValidationError
    ) {
      throw cause;
    }
    if (isAuthorizationFailure(cause)) {
      const failed: DecryptedIntegrationConnection = {
        ...current,
        updatedAt: runtime.now.toISOString(),
        authorization: {
          status: "reauthorization_required",
          lastCheckedAt: runtime.now.toISOString(),
        },
      };
      const committed = await commitProviderMutation(
        provider,
        mutation.revision,
        (lockedStorage) =>
          saveIntegrationConnection(
            failed,
            runtime.encryptionKey,
            lockedStorage
          ),
        runtime.storage
      );
      if (!committed.committed) {
        throw new IntegrationMutationSupersededError();
      }
      throw new IntegrationAuthorizationUnhealthyError();
    }
    throw cause;
  }
}

export async function syncIntegrationAccount(
  provider: IntegrationProvider,
  accountId: string,
  input: IntegrationServiceDependencies = {}
): Promise<IntegrationSyncResponse> {
  const expectedAccountId = accountId.trim();
  if (!expectedAccountId) throw new IntegrationAccountBindingError();
  const runtime = providerRuntime(provider, input);
  const mutation = await beginProviderMutation(
    provider,
    (lockedStorage) =>
      readIntegrationConnection(
        provider,
        expectedAccountId,
        runtime.encryptionKey,
        lockedStorage
      ),
    runtime.storage
  );
  const existing = mutation.snapshot;
  if (!existing) throw new IntegrationNotConnectedError();
  assertYouTubePolicyConsent(
    provider,
    existing,
    runtime.config.youtubeComplianceUrls
  );
  const attemptAt = runtime.now.toISOString();
  let current = existing;

  try {
    current = await refreshIfNeeded(existing, runtime);
    if (current.account.id !== expectedAccountId) {
      throw new IntegrationAccountBindingError();
    }
    const account = await runtime.adapter.fetchAccount(
      runtime.config,
      current.tokens.accessToken,
      { fetch: runtime.fetch, now: runtime.now }
    );
    current = {
      ...current,
      account,
      authorization: {
        status: "healthy",
        lastCheckedAt: attemptAt,
      },
    };
    const warnings: string[] = [];
    const posts = await runtime.adapter.syncOwnedPosts(
      runtime.config,
      current.tokens.accessToken,
      account,
      current.grantedScopes,
      {
        fetch: runtime.fetch,
        now: runtime.now,
        onWarning: (warning) => {
          if (!warnings.includes(warning)) warnings.push(warning);
        },
      }
    );
    const next: DecryptedIntegrationConnection = {
      ...current,
      account,
      updatedAt: attemptAt,
      sync: {
        status: warnings.length > 0 ? "partial" : "ready",
        lastAttemptAt: attemptAt,
        lastSuccessfulAt: attemptAt,
        warnings,
      },
    };
    const committed = await commitProviderMutation(
      provider,
      mutation.revision,
      async (lockedStorage) => {
        await saveIntegrationConnection(
          next,
          runtime.encryptionKey,
          lockedStorage
        );
        await saveProviderMetrics(
          { version: 1, provider, posts, syncedAt: attemptAt },
          expectedAccountId,
          lockedStorage
        );
      },
      runtime.storage
    );
    if (!committed.committed) {
      throw new IntegrationMutationSupersededError();
    }
    return {
      provider: await getPublicIntegrationStatus(provider, input),
      accountId: expectedAccountId,
      posts,
      syncedAt: attemptAt,
    };
  } catch (cause) {
    if (cause instanceof IntegrationMutationSupersededError) throw cause;
    const authorizationFailed =
      (cause instanceof IntegrationProviderError &&
        cause.kind === "authorization") ||
      (cause instanceof Error &&
        /refresh token is missing|invalid[_ -]?grant|invalid[_ -]?token/i.test(
          cause.message
        ));
    const failed: DecryptedIntegrationConnection = {
      ...current,
      updatedAt: attemptAt,
      authorization: authorizationFailed
        ? {
            status: "reauthorization_required",
            lastCheckedAt: attemptAt,
          }
        : (current.authorization ?? {
            status: "unknown",
            lastCheckedAt: null,
          }),
      sync: {
        ...current.sync,
        status: "error",
        lastAttemptAt: attemptAt,
        warnings: authorizationFailed
          ? ["Provider authorization is no longer valid. Reconnect the account."]
          : ["The latest provider sync failed; previously stored metrics were kept."],
      },
    };
    const committed = await commitProviderMutation(
      provider,
      mutation.revision,
      async (lockedStorage) => {
        await saveIntegrationConnection(
          failed,
          runtime.encryptionKey,
          lockedStorage
        );
        if (authorizationFailed) {
          await deleteProviderMetrics(provider, expectedAccountId, lockedStorage);
        }
      },
      runtime.storage
    );
    if (!committed.committed) {
      throw new IntegrationMutationSupersededError();
    }
    throw new IntegrationSyncError();
  }
}

export async function disconnectIntegrationAccount(
  provider: IntegrationProvider,
  accountId: string,
  input: IntegrationServiceDependencies = {}
) {
  const expectedAccountId = accountId.trim();
  if (!expectedAccountId) throw new IntegrationAccountBindingError();
  const runtime = providerRuntime(provider, input);
  const mutation = await beginProviderMutation(
    provider,
    (lockedStorage) =>
      readIntegrationConnection(
        provider,
        expectedAccountId,
        runtime.encryptionKey,
        lockedStorage
      ),
    runtime.storage
  );
  const original = mutation.snapshot;

  if (original) {
    await withIntegrationPublicationRecords(runtime, async (records) => {
      assertProviderHasNoUnresolvedPublication(
        records,
        provider,
        original.account.id
      );
      const marked: DecryptedIntegrationConnection = {
        ...original,
        updatedAt: runtime.now.toISOString(),
        authorization: {
          status: "unknown",
          lastCheckedAt: runtime.now.toISOString(),
        },
      };
      const reserved = await commitProviderMutation(
        provider,
        mutation.revision,
        (lockedStorage) =>
          saveIntegrationConnection(
            marked,
            runtime.encryptionKey,
            lockedStorage
          ),
        runtime.storage
      );
      if (!reserved.committed) throw new IntegrationMutationSupersededError();
    });
    try {
      await runtime.adapter.revokeAccess(
        runtime.config,
        original.tokens,
        original.account,
        { fetch: runtime.fetch, now: runtime.now }
      );
    } catch {
      // Provider revocation is the irreversible boundary. Retain the encrypted
      // local connection and its metrics if the provider does not confirm it,
      // so the user can retry instead of being shown a false disconnected state.
      const restoreMutation = await beginProviderMutation(
        provider,
        (lockedStorage) =>
          readIntegrationConnection(
            provider,
            expectedAccountId,
            runtime.encryptionKey,
            lockedStorage
          ),
        runtime.storage
      );
      if (
        restoreMutation.snapshot?.account.id === original.account.id &&
        restoreMutation.snapshot.authorization.status === "unknown"
      ) {
        await commitProviderMutation(
          provider,
          restoreMutation.revision,
          (lockedStorage) =>
            saveIntegrationConnection(
              original,
              runtime.encryptionKey,
              lockedStorage
            ),
          runtime.storage
        );
      }
      throw new IntegrationDisconnectError();
    }
    if (provider === "youtube") {
      await scrubYouTubeAutomationRecords(runtime, runtime.now, expectedAccountId);
    }
  }

  const committed = await commitProviderMutation(
    provider,
    mutation.revision,
    (lockedStorage) =>
      deleteIntegrationConnection(provider, expectedAccountId, lockedStorage),
    runtime.storage
  );
  if (!committed.committed && original) {
    const completion = await beginProviderMutation(
      provider,
      (lockedStorage) =>
        readIntegrationConnection(
          provider,
          expectedAccountId,
          runtime.encryptionKey,
          lockedStorage
        ),
      runtime.storage
    );
    if (
      completion.snapshot?.account.id === original.account.id &&
      completion.snapshot.authorization.status === "unknown"
    ) {
      const retry = await commitProviderMutation(
        provider,
        completion.revision,
        (lockedStorage) =>
          deleteIntegrationConnection(provider, expectedAccountId, lockedStorage),
        runtime.storage
      );
      if (!retry.committed) {
        throw new IntegrationMutationSupersededError();
      }
    } else {
      throw new IntegrationMutationSupersededError();
    }
  }
  return getPublicIntegrationStatus(provider, input);
}

/**
 * Delete PostForge's local connection, tokens, and cached metrics for one
 * account without claiming that the provider revoked its grant. This is
 * intentionally a separate, explicit workflow from disconnect so a failed
 * remote revocation can never be presented as successful.
 */
export async function forceDeleteLocalIntegrationData(
  provider: IntegrationProvider,
  accountId: string,
  input: IntegrationServiceDependencies = {}
) {
  const expectedAccountId = accountId.trim();
  if (!expectedAccountId) throw new IntegrationAccountBindingError();
  const runtime = dependencies(input);
  let encryptionKey: Buffer | null = null;
  try {
    encryptionKey = getIntegrationEncryptionKey(runtime.env);
  } catch {
    // Local deletion must remain possible after credentials or key setup has
    // been removed. In that case the lifecycle guard below becomes
    // conservatively provider-wide because the account id is unreadable.
  }
  const mutation = await beginProviderMutation(
    provider,
    (lockedStorage) =>
      encryptionKey
        ? readIntegrationConnection(
            provider,
            expectedAccountId,
            encryptionKey,
            lockedStorage
          )
        : Promise.resolve(null),
    runtime.storage
  );

  const assertNoUnresolved = (records: AutomationRecord[]) => {
    if (mutation.snapshot) {
      assertProviderHasNoUnresolvedPublication(
        records,
        provider,
        mutation.snapshot.account.id
      );
      return;
    }
    if (
      unresolvedPublications(records).some(
        (publication) => publication.provider === provider
      )
    ) {
      throw new UnresolvedPublicationConflictError(
        "This provider cannot be disconnected while a publication is pending or processing"
      );
    }
  };

  let committed: Awaited<ReturnType<typeof commitProviderMutation>>;
  if (runtime.automationRecords) {
    assertNoUnresolved(runtime.automationRecords);
    if (provider === "youtube") {
      const scrubbed = scrubYouTubeAutomationProviderData(
        runtime.automationRecords,
        {
          now: runtime.now,
          scrubAccountBindings: true,
          disconnectedAccountId: expectedAccountId,
        }
      );
      runtime.automationRecords.splice(
        0,
        runtime.automationRecords.length,
        ...scrubbed.records
      );
      await deleteAllYouTubePublishSessions(runtime.storage);
    }
    committed = await commitProviderMutation(
      provider,
      mutation.revision,
      (lockedStorage) =>
        deleteIntegrationConnection(
          provider,
          expectedAccountId,
          lockedStorage
        ),
      runtime.storage
    );
  } else if (runtime.storage === prismaIntegrationStorage) {
    committed = await withLockedAutomationRecords(async (records) => {
      assertNoUnresolved(records);
      const scrubbed =
        provider === "youtube"
          ? scrubYouTubeAutomationProviderData(records, {
              now: runtime.now,
              scrubAccountBindings: true,
              disconnectedAccountId: expectedAccountId,
            })
          : { records, changed: 0 };
      const result = await commitProviderMutation(
        provider,
        mutation.revision,
        async (lockedStorage) => {
          if (provider === "youtube") {
            await deleteAllYouTubePublishSessions(lockedStorage);
          }
          await deleteIntegrationConnection(
            provider,
            expectedAccountId,
            lockedStorage
          );
        },
        runtime.storage
      );
      return { records: scrubbed.records, result };
    });
  } else {
    assertNoUnresolved([]);
    if (provider === "youtube") {
      await deleteAllYouTubePublishSessions(runtime.storage);
    }
    committed = await commitProviderMutation(
      provider,
      mutation.revision,
      (lockedStorage) =>
        deleteIntegrationConnection(
          provider,
          expectedAccountId,
          lockedStorage
        ),
      runtime.storage
    );
  }
  if (!committed.committed) {
    throw new IntegrationMutationSupersededError();
  }
  return getPublicIntegrationStatus(provider, input);
}

export async function getIntegrationPerformanceResponse(
  input: IntegrationServiceDependencies = {}
): Promise<IntegrationPerformanceResponse> {
  const deps = dependencies(input);
  const statusResponse = await getIntegrationsResponse(input);
  const metricRecords = await Promise.all(
    INTEGRATION_PROVIDERS.map(async (provider) => {
      try {
        const records = await listProviderMetricRecords(provider, deps.storage);
        if (provider !== "youtube") return records;
        const status = statusResponse.providers.find(
          (candidate) => candidate.provider === "youtube"
        );
        const freshAccountIds = new Set(
          status?.accounts
            .filter((account) => account.authorization.status === "healthy")
            .map((account) => account.account.id) ?? []
        );
        const retained: StoredProviderMetrics[] = [];
        for (const record of records) {
          const accountId = record.posts[0]?.accountId;
          if (!accountId) continue;
          if (
            !youtubeProviderDataIsFresh(record.syncedAt, deps.now) ||
            !status?.connected ||
            !freshAccountIds.has(accountId)
          ) {
            await deleteProviderMetrics(provider, accountId, deps.storage);
            continue;
          }
          retained.push(record);
        }
        return retained;
      } catch {
        return [];
      }
    })
  );
  const flatRecords = metricRecords.flat();
  const connectedAccountIds = new Map<
    IntegrationProvider,
    Set<string>
  >();
  for (const status of statusResponse.providers) {
    connectedAccountIds.set(
      status.provider,
      new Set(
        status.configuration === "ready"
          ? status.accounts
              .filter(
                (account) =>
                  account.authorization.status === "healthy" &&
                  (status.provider !== "youtube" ||
                    status.youtubeCompliance?.consentAccepted === true)
              )
              .map((account) => account.account.id)
          : []
      )
    );
  }
  const available = flatRecords.filter((record) => {
    const accountId = record.posts[0]?.accountId;
    if (!accountId) return false;
    return (
      connectedAccountIds.get(record.provider)?.has(accountId) ?? false
    );
  });
  const posts = available
    .flatMap((record) => record.posts)
    .sort((left, right) => {
      const leftTime = left.publishedAt
        ? new Date(left.publishedAt).getTime()
        : 0;
      const rightTime = right.publishedAt
        ? new Date(right.publishedAt).getTime()
        : 0;
      return rightTime - leftTime;
    });
  const lastUpdatedAt = available
    .map((record) => record.syncedAt)
    .sort()
    .at(-1) ?? null;

  return { ...statusResponse, posts, lastUpdatedAt };
}
