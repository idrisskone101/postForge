import { isCharacterRecord, type CharacterRecord } from "@/lib/characters";
import { readWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";
import { CharactersPageClient } from "./characters-page-client";

export const metadata = { title: "Characters - PostForge" };
export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const initial = await loadCharacters();
  return <CharactersPageClient initial={initial} />;
}

async function loadCharacters() {
  try {
    const records = await readWorkspaceFeatureRecords<CharacterRecord>("characters");
    return { records: records.filter(isCharacterRecord), error: null };
  } catch (cause) {
    console.error("Failed to read characters:", cause);
    return { records: [], error: "Unable to load characters" };
  }
}
