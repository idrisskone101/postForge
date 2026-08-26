import type { CharacterRecord } from "@/lib/characters";

export const GENDER_FILTER_OPTIONS = [
  "All identities",
  "Female",
  "Male",
  "Non-binary",
] as const;

export function photoReady(record: CharacterRecord): boolean {
  return Boolean(record.avatarId && record.previewKind === "photographic");
}

export function filterCharacters(
  records: CharacterRecord[],
  search: string,
  gender: string
): CharacterRecord[] {
  const needle = search.toLowerCase();
  return records.filter((record) => {
    const matchesSearch = `${record.name} ${record.attributes.ethnicity} ${record.attributes.aesthetic}`
      .toLowerCase()
      .includes(needle);
    const matchesGender =
      gender === "All identities" || record.attributes.gender === gender;
    return matchesSearch && matchesGender;
  });
}

export function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
