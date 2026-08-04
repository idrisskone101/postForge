import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export const WORKSPACE_FEATURES = [
  "automations",
  "characters",
  "collections",
  "connections",
] as const;

export type WorkspaceFeature = (typeof WORKSPACE_FEATURES)[number];

type FeatureRecord = { id: string };

export function workspaceFeatureKey(feature: WorkspaceFeature) {
  return `workspace-features/${feature}.json`;
}

export function decodeWorkspaceFeatureRecords<T extends FeatureRecord>(
  data: Uint8Array | null | undefined
): T[] {
  if (!data) return [];

  try {
    const parsed = JSON.parse(Buffer.from(data).toString("utf8"));
    return Array.isArray(parsed)
      ? parsed.filter(
          (record): record is T =>
            typeof record === "object" &&
            record !== null &&
            typeof (record as { id?: unknown }).id === "string"
        )
      : [];
  } catch {
    return [];
  }
}

function encodeFeatureRecords<T extends FeatureRecord>(records: T[]) {
  return Uint8Array.from(
    Buffer.from(JSON.stringify(records, null, 2), "utf8")
  );
}

export function isWorkspaceFeature(value: string): value is WorkspaceFeature {
  return (WORKSPACE_FEATURES as readonly string[]).includes(value);
}

export async function readWorkspaceFeatureRecords<T extends FeatureRecord>(
  feature: WorkspaceFeature
): Promise<T[]> {
  const stored = await prisma.storedAsset.findUnique({
    where: { key: workspaceFeatureKey(feature) },
    select: { data: true },
  });

  return decodeWorkspaceFeatureRecords<T>(stored?.data);
}

export async function transactWorkspaceFeatureRecords<
  T extends FeatureRecord,
  R,
>(
  feature: WorkspaceFeature,
  operation: (
    records: T[],
    transaction: Prisma.TransactionClient
  ) => Promise<{ records: T[]; result: R }>
): Promise<R> {
  const key = workspaceFeatureKey(feature);
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw<unknown[]>`
      SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))
    `;
    const stored = await transaction.storedAsset.findUnique({
      where: { key },
      select: { data: true },
    });
    const mutation = await operation(
      decodeWorkspaceFeatureRecords<T>(stored?.data),
      transaction
    );
    const data = encodeFeatureRecords(mutation.records);
    await transaction.storedAsset.upsert({
      where: { key },
      update: { data },
      create: { key, data },
    });
    return mutation.result;
  });
}

export async function updateWorkspaceFeatureRecords<T extends FeatureRecord>(
  feature: WorkspaceFeature,
  update: (records: T[]) => T[]
): Promise<T[]> {
  return transactWorkspaceFeatureRecords<T, T[]>(
    feature,
    async (records) => {
      const updated = update(records);
      return { records: updated, result: updated };
    }
  );
}

export async function upsertWorkspaceFeatureRecord<T extends FeatureRecord>(
  feature: WorkspaceFeature,
  record: T
): Promise<T[]> {
  return updateWorkspaceFeatureRecords<T>(feature, (records) => {
    const index = records.findIndex((candidate) => candidate.id === record.id);
    if (index >= 0) records[index] = record;
    else records.unshift(record);
    return records;
  });
}

export async function deleteWorkspaceFeatureRecord<T extends FeatureRecord>(
  feature: WorkspaceFeature,
  id: string
): Promise<T[]> {
  return updateWorkspaceFeatureRecords<T>(feature, (records) =>
    records.filter((record) => record.id !== id)
  );
}
