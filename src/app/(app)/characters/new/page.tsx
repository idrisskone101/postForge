import { CharacterBuilderClientLazy } from "./character-builder-client-lazy";
import { CharacterBuilderStatic } from "./character-builder-static";

type CharacterBuilderPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CharacterBuilderPage({
  searchParams,
}: CharacterBuilderPageProps) {
  const params = await searchParams;
  const rawId = params.id;
  const editId = Array.isArray(rawId) ? rawId[0] ?? null : rawId ?? null;

  return (
    <>
      {editId ? null : <CharacterBuilderStatic />}
      <CharacterBuilderClientLazy editId={editId} />
    </>
  );
}
