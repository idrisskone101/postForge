import { isCharacterRecord, type CharacterRecord } from "@/lib/characters";
import { readWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";
import { CharactersPageClient } from "./characters-page-client";

export default async function CharactersPage() {
  const records = (
    await readWorkspaceFeatureRecords<CharacterRecord>("characters")
  ).filter(isCharacterRecord);

  return <CharactersPageClient initialRecords={records} />;
}
