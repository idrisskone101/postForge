import type { Prisma } from "@/generated/prisma/client";
import {
  isAutomationRecord,
  publicationIsUnresolved,
  type AutomationPublication,
  type AutomationRecord,
  type AutomationSocialDestination,
} from "./automations";
import { transactWorkspaceFeatureRecords } from "./workspace-feature-store";

export class UnresolvedPublicationConflictError extends Error {
  readonly statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = "UnresolvedPublicationConflictError";
  }
}

export { publicationIsUnresolved } from "./automations";

export function unresolvedPublications(records: readonly AutomationRecord[]) {
  return records
    .filter(isAutomationRecord)
    .map((record) => record.publication)
    .filter(
      (publication): publication is AutomationPublication =>
        Boolean(publication && publicationIsUnresolved(publication))
    );
}

export function assertAssetsAreNotPublicationLeased(
  records: readonly AutomationRecord[],
  assetIds: readonly string[]
) {
  const ids = new Set(assetIds);
  const conflict = unresolvedPublications(records).find((publication) =>
    ids.has(publication.assetId)
  );
  if (conflict) {
    throw new UnresolvedPublicationConflictError(
      "This approved video is retained while its provider publication is pending or processing"
    );
  }
}

export function assertProviderHasNoUnresolvedPublication(
  records: readonly AutomationRecord[],
  provider: AutomationSocialDestination,
  accountId: string
) {
  const conflict = unresolvedPublications(records).find(
    (publication) =>
      publication.provider === provider &&
      (publication.accountId === accountId ||
        (publication.providerStatus === "LOCAL_RETENTION_OUTCOME_UNKNOWN" &&
          !publication.manualResolution))
  );
  if (conflict) {
    throw new UnresolvedPublicationConflictError(
      "This account cannot be disconnected while a provider publication is pending or processing"
    );
  }
}

export function assertReconnectCompatibleWithPublications(
  records: readonly AutomationRecord[],
  provider: AutomationSocialDestination,
  nextAccountId: string,
  nextCanPublish: boolean
) {
  const active = unresolvedPublications(records).filter(
    (publication) => publication.provider === provider
  );
  if (
    active.some((publication) => publication.accountId !== nextAccountId) ||
    (active.length > 0 && !nextCanPublish)
  ) {
    throw new UnresolvedPublicationConflictError(
      "The new authorization cannot replace this connection while a publication is unresolved; reconnect the same account with publishing permission"
    );
  }
}

export async function withLockedAutomationRecords<R>(
  operation: (
    records: AutomationRecord[],
    transaction: Prisma.TransactionClient
  ) => Promise<{ records?: AutomationRecord[]; result: R }>
) {
  return transactWorkspaceFeatureRecords<AutomationRecord, R>(
    "automations",
    async (records, transaction) => {
      const result = await operation(records.filter(isAutomationRecord), transaction);
      return { records: result.records ?? records, result: result.result };
    }
  );
}
