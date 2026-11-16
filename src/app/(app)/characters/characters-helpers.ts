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

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatShortDate(value: string): string {
  return SHORT_DATE.format(new Date(value));
}

export function characterDateMeta(record: CharacterRecord): string {
  const date = formatShortDate(record.updatedAt);
  return photoReady(record) ? date : `Draft, ${date}`;
}
