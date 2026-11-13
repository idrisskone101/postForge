export const CHARACTER_PORTRAIT_WIDTHS = [320, 480, 720] as const;

export function characterPortraitSrcSet(avatarId: string): string {
  const base = `/characters/portrait/${encodeURIComponent(avatarId)}`;
  return CHARACTER_PORTRAIT_WIDTHS.map((width) => `${base}?w=${width} ${width}w`).join(", ");
}
