export type ByteRange = { start: number; end: number };

export function parseSingleByteRange(
  value: string | null,
  size: number
): ByteRange | null {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || size <= 0) throw new RangeError("Invalid byte range");

  const [, startValue, endValue] = match;
  if (!startValue && !endValue) throw new RangeError("Invalid byte range");

  if (!startValue) {
    const suffixLength = Number(endValue);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      throw new RangeError("Invalid byte range");
    }
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = Number(startValue);
  const requestedEnd = endValue ? Number(endValue) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= size
  ) {
    throw new RangeError("Invalid byte range");
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}
