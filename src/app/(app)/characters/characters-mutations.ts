import { buildCharacterPrompt } from "@/lib/character-attributes";
import { isCharacterRecord, type CharacterRecord } from "@/lib/characters";
import {
  removeWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";

export type RemoveCharacterResult =
  | { kind: "cancelled" }
  | { kind: "deleted"; records: CharacterRecord[] }
  | {
      kind: "failed";
      error: string;
      records: CharacterRecord[] | null;
      recovered: CharacterRecord | null;
    };

export type DuplicateCharacterResult =
  | { kind: "saved"; records: CharacterRecord[] }
  | { kind: "failed"; error: string };

export async function removeCharacter(
  record: CharacterRecord,
  records: CharacterRecord[]
): Promise<RemoveCharacterResult> {
  const deletionDetail = record.avatarId
    ? "Its reusable avatar will also be removed. Existing generated outputs stay available."
    : "Existing generated outputs stay available.";
  if (!window.confirm(`Delete ${record.name}? ${deletionDetail}`)) {
    return { kind: "cancelled" };
  }

  let linkedAvatarRemoved = false;
  try {
    const avatarIsShared = Boolean(
      record.avatarId &&
        records.some(
          (candidate) =>
            candidate.id !== record.id && candidate.avatarId === record.avatarId
        )
    );
    if (record.avatarId && !avatarIsShared) {
      const response = await fetch(
        `/api/avatars/${encodeURIComponent(record.avatarId)}`,
        { method: "DELETE" }
      );
      if (!response.ok && response.status !== 404) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          body?.error ?? "The linked reusable avatar could not be deleted."
        );
      }
      linkedAvatarRemoved = true;
    }
    const { records: next } = await removeWorkspaceFeature<CharacterRecord>(
      "characters",
      record.id
    );
    return { kind: "deleted", records: next.filter(isCharacterRecord) };
  } catch (cause) {
    if (!linkedAvatarRemoved) {
      return {
        kind: "failed",
        error: cause instanceof Error ? cause.message : "Unable to delete character",
        records: null,
        recovered: null,
      };
    }
    try {
      const recovered: CharacterRecord = {
        ...record,
        avatarId: null,
        previewKind: undefined,
        previewFingerprint: null,
        updatedAt: new Date().toISOString(),
      };
      const { records: next } = await saveWorkspaceFeature("characters", recovered);
      return {
        kind: "failed",
        error: cause instanceof Error ? cause.message : "Unable to delete character",
        records: next.filter(isCharacterRecord),
        recovered,
      };
    } catch {
      return {
        kind: "failed",
        error: cause instanceof Error ? cause.message : "Unable to delete character",
        records: null,
        recovered: null,
      };
    }
  }
}

export async function duplicateCharacter(
  record: CharacterRecord
): Promise<DuplicateCharacterResult> {
  const now = new Date().toISOString();
  const copy: CharacterRecord = {
    ...record,
    id: `character_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${record.name} copy`,
    previewSeed: record.previewSeed + 1,
    avatarId: null,
    previewKind: undefined,
    previewFingerprint: null,
    createdAt: now,
    updatedAt: now,
  };
  try {
    const { records: next } = await saveWorkspaceFeature("characters", copy);
    return { kind: "saved", records: next.filter(isCharacterRecord) };
  } catch (cause) {
    return {
      kind: "failed",
      error: cause instanceof Error ? cause.message : "Unable to duplicate character",
    };
  }
}

export async function copyCharacterPrompt(record: CharacterRecord) {
  await navigator.clipboard.writeText(buildCharacterPrompt(record.attributes));
}
