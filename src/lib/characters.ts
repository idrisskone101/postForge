import type { CharacterAttributes } from "@/lib/character-attributes";

export type CharacterRecord = {
  id: string;
  name: string;
  attributes: CharacterAttributes;
  previewSeed: number;
  avatarId?: string | null;
  previewKind?: "photographic";
  previewFingerprint?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isCharacterRecord(value: unknown): value is CharacterRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CharacterRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.previewSeed === "number" &&
    (record.avatarId === undefined ||
      record.avatarId === null ||
      typeof record.avatarId === "string") &&
    (record.previewKind === undefined || record.previewKind === "photographic") &&
    (record.previewFingerprint === undefined ||
      record.previewFingerprint === null ||
      typeof record.previewFingerprint === "string") &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.attributes === "object" &&
    record.attributes !== null
  );
}
