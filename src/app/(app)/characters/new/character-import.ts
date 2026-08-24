import {
  CHARACTER_ATTRIBUTE_SECTIONS,
  type CharacterAttributes,
} from "@/lib/character-attributes";

export function parseImportedCharacterAttributes(input: string): CharacterAttributes {
  const validGroups = CHARACTER_ATTRIBUTE_SECTIONS.flatMap((section) => section.groups);
  const next: CharacterAttributes = {};

  function acceptValue(key: string, value: string) {
    const group = validGroups.find((candidate) => candidate.key === key);
    if (!group) return;
    const trimmed = value.trim();
    if (group.key === "lipFullness") {
      const number = Number(trimmed.replace(/%$/, ""));
      if (Number.isFinite(number) && number >= 0 && number <= 100) {
        next[group.key] = String(Math.round(number));
      }
      return;
    }
    const supported = group.options.find(
      (option) => option.toLowerCase() === trimmed.toLowerCase()
    );
    if (supported) next[group.key] = supported;
  }

  try {
    const parsed = JSON.parse(input) as unknown;
    const candidate =
      parsed && typeof parsed === "object" && "attributes" in parsed
        ? (parsed as { attributes: unknown }).attributes
        : parsed;
    if (candidate && typeof candidate === "object") {
      Object.entries(candidate as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === "string") acceptValue(key, value);
      });
    }
  } catch {
    for (const group of validGroups) {
      const expression = new RegExp(`${group.label}\\s*:\\s*([^,\\n]+)`, "i");
      const match = input.match(expression);
      if (match?.[1]) acceptValue(group.key, match[1]);
    }
  }

  if (Object.keys(next).length === 0) {
    throw new Error("No supported character attributes were found.");
  }
  return next;
}
