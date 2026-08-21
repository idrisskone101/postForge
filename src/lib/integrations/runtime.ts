import type { AutomationRecord } from "../automations";
import { withLockedAutomationRecords } from "../publication-lifecycle";
import {
  getProviderOAuthConfig,
  type IntegrationEnvironment,
} from "./config";
import { getIntegrationEncryptionKey } from "./crypto";
import { IntegrationNotConfiguredError } from "./errors";
import { getIntegrationProviderAdapter } from "./providers";
import type { ProviderFetch } from "./providers/types";
import type { ProviderPublishingDependencies } from "./publishing";
import { scrubYouTubeAutomationProviderData } from "./retention-records";
import {
  prismaIntegrationStorage,
  type IntegrationStorage,
  type StoredOAuthStateRecord,
} from "./store";
import type { IntegrationProvider } from "./types";

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

export function dependencies(input: IntegrationServiceDependencies = {}) {
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

export async function withIntegrationPublicationRecords<R>(
  runtime: ReturnType<typeof dependencies>,
  operation: (records: AutomationRecord[]) => Promise<R> | R
) {
  if (runtime.automationRecords) return operation(runtime.automationRecords);
  if (runtime.storage !== prismaIntegrationStorage) return operation([]);
  return withLockedAutomationRecords(async (records) => ({
    result: await operation(records),
  }));
}

export async function scrubYouTubeAutomationRecords(
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

export function providerRuntime(
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

export type IntegrationProviderRuntime = ReturnType<typeof providerRuntime>;
