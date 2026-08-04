export function unicodeCodePointLength(value: string) {
  return Array.from(value).length;
}

/** Replace lone UTF-16 surrogates with U+FFFD while preserving valid pairs. */
export function toWellFormedUnicode(value: string) {
  let normalized = "";
  for (let index = 0; index < value.length; index += 1) {
    const current = value.charCodeAt(index);
    if (current >= 0xd800 && current <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        normalized += value[index] + value[index + 1];
        index += 1;
      } else {
        normalized += "\ufffd";
      }
    } else if (current >= 0xdc00 && current <= 0xdfff) {
      normalized += "\ufffd";
    } else {
      normalized += value[index];
    }
  }
  return normalized;
}

export function isWellFormedUnicode(value: string) {
  return toWellFormedUnicode(value) === value;
}

export function truncateUnicodeCodePoints(value: string, maximum: number) {
  return Array.from(toWellFormedUnicode(value)).slice(0, maximum).join("");
}

/** Truncate by JavaScript/UTF-16 units without cutting a valid surrogate pair. */
export function truncateUtf16Units(value: string, maximum: number) {
  if (!Number.isSafeInteger(maximum) || maximum < 0) {
    throw new RangeError("UTF-16 maximum must be a non-negative integer");
  }
  const wellFormed = toWellFormedUnicode(value);
  if (wellFormed.length <= maximum) return wellFormed;
  let end = maximum;
  const prior = wellFormed.charCodeAt(end - 1);
  const next = wellFormed.charCodeAt(end);
  if (
    prior >= 0xd800 &&
    prior <= 0xdbff &&
    next >= 0xdc00 &&
    next <= 0xdfff
  ) {
    end -= 1;
  }
  return wellFormed.slice(0, end);
}

/** Truncate on Unicode scalar boundaries while respecting a UTF-8 byte cap. */
export function truncateUtf8Bytes(value: string, maximum: number) {
  if (!Number.isSafeInteger(maximum) || maximum < 0) {
    throw new RangeError("UTF-8 maximum must be a non-negative integer");
  }
  const encoder = new TextEncoder();
  let used = 0;
  const accepted: string[] = [];
  for (const symbol of toWellFormedUnicode(value)) {
    const size = encoder.encode(symbol).length;
    if (used + size > maximum) break;
    accepted.push(symbol);
    used += size;
  }
  return accepted.join("");
}
