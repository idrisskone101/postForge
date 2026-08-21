import { deriveCapabilities } from "./config";
import {
  IntegrationAccountBindingError,
  IntegrationAuthorizationUnhealthyError,
  IntegrationMutationSupersededError,
  IntegrationPublishScopeError,
} from "./errors";
import {
  commitSavedConnection,
  isAuthorizationFailure,
  persistAuthorizationFailure,
  refreshIfNeeded,
  requireAccountId,
  requireConnectedAccount,
} from "./account-mutation";
import { providerRuntime } from "./runtime";
import type { IntegrationServiceDependencies } from "./runtime";
import {
  queryTikTokCreatorPublishingInfo,
  type TikTokCreatorPublishingInfo,
} from "./publishing";
import type { DecryptedIntegrationConnection } from "./types";

export async function getTikTokPublishingPreflight(
  expectedAccountId: string,
  dependenciesInput: IntegrationServiceDependencies = {}
): Promise<{
  account: DecryptedIntegrationConnection["account"];
  creator: TikTokCreatorPublishingInfo;
  directPostApprovalAcknowledged: boolean;
}> {
  const normalizedAccountId = requireAccountId(expectedAccountId);
  const runtime = providerRuntime("tiktok", dependenciesInput);
  const { mutation, existing } = await requireConnectedAccount(
    "tiktok",
    normalizedAccountId,
    runtime
  );
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
    await commitSavedConnection(
      "tiktok",
      mutation.revision,
      current,
      runtime
    );
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
      await persistAuthorizationFailure(
        "tiktok",
        current,
        mutation.revision,
        runtime
      );
    }
    throw cause;
  }
}
