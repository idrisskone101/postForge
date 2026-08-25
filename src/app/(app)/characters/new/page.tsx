import { CharacterBuilderClient } from "./character-builder-client";

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
      {editId ? null : (
        <link
          rel="preload"
          as="image"
          href="/character-builder/default-portrait.webp"
          fetchPriority="high"
        />
      )}
      <CharacterBuilderClient editId={editId} />
    </>
  );
}
