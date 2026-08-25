export function RatioIcon({ ratio }: { ratio: string }) {
  const [width, height] = ratio.split(":").map(Number);
  const safeWidth = Number.isFinite(width) ? width : 1;
  const safeHeight = Number.isFinite(height) ? height : 1;
  const max = Math.max(safeWidth, safeHeight);

  return (
    <span
      className="block rounded-[2px] border-[1.5px] border-current"
      style={{
        width: `${Math.max(7, Math.round((safeWidth / max) * 13))}px`,
        height: `${Math.max(7, Math.round((safeHeight / max) * 13))}px`,
      }}
    />
  );
}
