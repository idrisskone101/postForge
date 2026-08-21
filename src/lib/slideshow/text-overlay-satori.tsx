import { readFile } from "node:fs/promises";
import { join } from "node:path";
import satori from "satori";
import type { Font } from "satori";

import { overlayTree } from "./overlay-tree";
import type {
  SlideshowRenderTextSettings,
  SlideshowTextOverlaySlide,
} from "./text-overlay";

type FontFace = {
  file: string;
  name: string;
  weight: 400 | 600 | 700;
  style: "normal" | "italic";
};

const fontsDir = join(process.cwd(), "src/lib/slideshow/fonts");

const FONT_FILES: FontFace[] = [
  { file: "Inter-Regular.ttf", name: "Inter", weight: 400, style: "normal" },
  { file: "Inter-SemiBold.ttf", name: "Inter", weight: 600, style: "normal" },
  { file: "Inter-Bold.ttf", name: "Inter", weight: 700, style: "normal" },
  { file: "Inter-Italic.ttf", name: "Inter", weight: 400, style: "italic" },
  {
    file: "LiberationSerif-Regular.ttf",
    name: "Liberation Serif",
    weight: 400,
    style: "normal",
  },
  {
    file: "LiberationSerif-Bold.ttf",
    name: "Liberation Serif",
    weight: 700,
    style: "normal",
  },
  {
    file: "LiberationSerif-Italic.ttf",
    name: "Liberation Serif",
    weight: 400,
    style: "italic",
  },
  {
    file: "LiberationSerif-BoldItalic.ttf",
    name: "Liberation Serif",
    weight: 700,
    style: "italic",
  },
  {
    file: "LiberationMono-Regular.ttf",
    name: "Liberation Mono",
    weight: 400,
    style: "normal",
  },
  {
    file: "LiberationMono-Bold.ttf",
    name: "Liberation Mono",
    weight: 700,
    style: "normal",
  },
];

const MARKUP_CACHE_LIMIT = 64;
const markupCache = new Map<string, string>();

let fontCache: Font[] | null = null;

async function overlayFonts() {
  if (fontCache) return fontCache;
  fontCache = await Promise.all(
    FONT_FILES.map(async (face) => ({
      name: face.name,
      data: await readFile(join(fontsDir, face.file)),
      weight: face.weight,
      style: face.style,
    })),
  );
  return fontCache;
}

function overlayCacheKey(
  slide: SlideshowTextOverlaySlide,
  width: number,
  height: number,
  settings: SlideshowRenderTextSettings,
) {
  return JSON.stringify({
    id: slide.id,
    eyebrow: slide.eyebrow ?? "",
    headline: slide.headline,
    body: slide.body ?? "",
    width,
    height,
    settings,
  });
}

export async function createSlideshowTextOverlayMarkup(
  slide: SlideshowTextOverlaySlide,
  width: number,
  height: number,
  settings: SlideshowRenderTextSettings = {},
) {
  const key = overlayCacheKey(slide, width, height, settings);
  const cached = markupCache.get(key);
  if (cached) return cached;

  const svg = await satori(overlayTree(slide, width, height, settings), {
    width,
    height,
    fonts: await overlayFonts(),
    embedFont: true,
  });
  const marked = svg.replace(
    "<svg ",
    '<svg data-slideshow-text-overlay="true" ',
  );
  if (markupCache.size >= MARKUP_CACHE_LIMIT) {
    const oldest = markupCache.keys().next().value;
    if (oldest) markupCache.delete(oldest);
  }
  markupCache.set(key, marked);
  return marked;
}

export async function createSlideshowTextOverlaySvg(
  slide: SlideshowTextOverlaySlide,
  width: number,
  height: number,
  settings: SlideshowRenderTextSettings = {},
) {
  return Buffer.from(
    await createSlideshowTextOverlayMarkup(slide, width, height, settings),
  );
}
