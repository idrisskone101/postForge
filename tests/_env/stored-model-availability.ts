import { getAllModels } from "../../src/lib/ai/models";

export const STORED_ENABLED_MODEL_IDS = getAllModels()
  .slice(0, 2)
  .map((model) => model.id);

const record = {
  id: "model-availability",
  enabledModelIds: STORED_ENABLED_MODEL_IDS,
  defaultImageModelId: null,
  defaultVideoModelId: null,
  defaultIntelligenceModelId: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const storeReads: string[] = [];

(globalThis as unknown as { prisma: unknown }).prisma = {
  storedAsset: {
    findUnique: async ({ where }: { where: { key: string } }) => {
      storeReads.push(where.key);
      return where.key === "workspace-features/models.json"
        ? { data: Uint8Array.from(Buffer.from(JSON.stringify([record]), "utf8")) }
        : null;
    },
  },
};
