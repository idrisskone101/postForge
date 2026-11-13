export function RatioIcon({ ratio }: { ratio: string }) {
  const [width, height] = ratio.split(":").map(Number);
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;

  return (
    <span
      aria-hidden="true"
      className="block h-[18px] shrink-0 rounded-[3px] border-[1.5px] border-current"
      style={{
        width: `${Math.min(34, Math.max(8, Math.round((18 * safeWidth) / safeHeight)))}px`,
      }}
    />
  );
}
