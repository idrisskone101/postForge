import { CharacterBuilderClient } from "./character-builder-client";

export const metadata = { title: "Character builder - PostForge" };

type CharacterBuilderPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CharacterBuilderPage({
  searchParams,
}: CharacterBuilderPageProps) {
  const params = await searchParams;
  const rawId = params.id;
  const editId = Array.isArray(rawId) ? rawId[0] ?? null : rawId ?? null;

  return <CharacterBuilderClient key={editId ?? "new"} editId={editId} />;
}
