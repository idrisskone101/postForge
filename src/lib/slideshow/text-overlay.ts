export const SLIDESHOW_TEXT_REFERENCE_WIDTH = 282;

export const SLIDESHOW_ASPECT_DIMENSIONS: Record<
  string,
  { width: number; height: number }
> = {
  "9:16": { width: 1080, height: 1920 },
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export type SlideshowTextOverlaySlide = {
  id: string;
  eyebrow?: string;
  headline: string;
  body?: string;
};

export type SlideshowRenderTextSettings = {
  font?:
    | "Poppins"
    | "Inter"
    | "Serif"
    | "SerifItalic"
    | "Editorial"
    | "Condensed"
    | "Mono"
    | "Rounded"
    | string;
  color?: string;
  style?: "outline" | "solid" | "light" | "translucent" | "plain";
  size?: number;
  position?: "top" | "center" | "bottom";
  width?: number;
  align?: "left" | "center" | "right";
  padding?: "padded" | "flush";
  backgroundRadius?: number;
};

export function getSlideshowDimensions(aspectRatio: string) {
  return SLIDESHOW_ASPECT_DIMENSIONS[aspectRatio] ?? SLIDESHOW_ASPECT_DIMENSIONS["9:16"];
}

export function isSlideshowOverlayCanvasSize(width: number, height: number) {
  return Object.values(SLIDESHOW_ASPECT_DIMENSIONS).some(
    (size) => size.width === width && size.height === height,
  );
}

export function slideshowTextScale(canvasWidth: number) {
  return canvasWidth / SLIDESHOW_TEXT_REFERENCE_WIDTH;
}

export function slideshowHeadlineFontSize(
  size: number | undefined,
  canvasWidth: number,
) {
  const configured =
    typeof size === "number" && Number.isFinite(size) ? size : 56;
  return configured * slideshowTextScale(canvasWidth);
}

export function wrapSlideshowText(
  value: string,
  maxCharacters: number,
  maxLines: number,
) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxCharacters || !line) {
      line = next;
      continue;
    }

    lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  const consumedWords = lines.join(" ").split(/\s+/).length;
  if (consumedWords < words.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:!?]?$/, "")}…`;
  }
  return lines;
}

export function slideshowOverlayTextColor(value = "white") {
  const colors: Record<string, string> = {
    white: "#ffffff",
    black: "#111111",
    coral: "#ff8a6e",
    blue: "#78b9e7",
    yellow: "#f7e27d",
  };
  return colors[value] ?? (/^#[\da-f]{3,8}$/i.test(value) ? value : "#ffffff");
}
