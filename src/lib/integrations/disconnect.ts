import {
  assertProviderHasNoUnresolvedPublication,
  UnresolvedPublicationConflictError,
  unresolvedPublications,
  withLockedAutomationRecords,
} from "../publication-lifecycle";
import type { AutomationRecord } from "../automations";
import { getIntegrationEncryptionKey } from "./crypto";
import {
  IntegrationDisconnectError,
  IntegrationMutationSupersededError,
} from "./errors";
import {
  beginAccountMutation,
  requireAccountId,
} from "./account-mutation";
import { getPublicIntegrationStatus } from "./account-status";
import {
  dependencies,
  providerRuntime,
  scrubYouTubeAutomationRecords,
  withIntegrationPublicationRecords,
} from "./runtime";
import type { IntegrationServiceDependencies } from "./runtime";
import { scrubYouTubeAutomationProviderData } from "./retention-records";
import {
  beginProviderMutation,
  commitProviderMutation,
  deleteAllYouTubePublishSessions,
  deleteIntegrationConnection,
  prismaIntegrationStorage,
  readIntegrationConnection,
  saveIntegrationConnection,
} from "./store";
import type {
  DecryptedIntegrationConnection,
  IntegrationProvider,
} from "./types";

export async function disconnectIntegrationAccount(
  provider: IntegrationProvider,
  accountId: string,
  input: IntegrationServiceDependencies = {}
) {
  const expectedAccountId = requireAccountId(accountId);
  const runtime = providerRuntime(provider, input);
  const mutation = await beginAccountMutation(
    provider,
    expectedAccountId,
    runtime
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
      const restoreMutation = await beginAccountMutation(
        provider,
        expectedAccountId,
        runtime
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
    const completion = await beginAccountMutation(
      provider,
      expectedAccountId,
      runtime
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
  const expectedAccountId = requireAccountId(accountId);
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
