import { readFile } from "node:fs/promises";
import { join } from "node:path";
import satori from "satori";
import type { Font } from "satori";

import { overlayTree, slideshowOverlayLayerOfKey } from "./overlay-tree";
import type {
  SlideshowOverlayBoxes,
  SlideshowRenderTextSettings,
  SlideshowTextOverlaySlide,
} from "./text-overlay";

export type SlideshowTextOverlay = {
  markup: string;
  boxes: SlideshowOverlayBoxes;
};

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
const overlayCache = new Map<string, SlideshowTextOverlay>();

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

export async function createSlideshowTextOverlay(
  slide: SlideshowTextOverlaySlide,
  width: number,
  height: number,
  settings: SlideshowRenderTextSettings = {},
): Promise<SlideshowTextOverlay> {
  const key = overlayCacheKey(slide, width, height, settings);
  const cached = overlayCache.get(key);
  if (cached) return cached;

  const boxes: SlideshowOverlayBoxes = {};
  const svg = await satori(overlayTree(slide, width, height, settings), {
    width,
    height,
    fonts: await overlayFonts(),
    embedFont: true,
    onNodeDetected(node) {
      const layer = slideshowOverlayLayerOfKey(node.key);
      if (!layer) return;
      const seen = boxes[layer];
      const left = Math.min(seen?.x ?? node.left, node.left);
      const top = Math.min(seen?.y ?? node.top, node.top);
      const right = Math.max(
        seen ? seen.x + seen.width : node.left + node.width,
        node.left + node.width,
      );
      const bottom = Math.max(
        seen ? seen.y + seen.height : node.top + node.height,
        node.top + node.height,
      );
      boxes[layer] = {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      };
    },
  });
  const overlay = {
    markup: svg.replace("<svg ", '<svg data-slideshow-text-overlay="true" '),
    boxes,
  };
  if (overlayCache.size >= MARKUP_CACHE_LIMIT) {
    const oldest = overlayCache.keys().next().value;
    if (oldest) overlayCache.delete(oldest);
  }
  overlayCache.set(key, overlay);
  return overlay;
}

export async function createSlideshowTextOverlayMarkup(
  slide: SlideshowTextOverlaySlide,
  width: number,
  height: number,
  settings: SlideshowRenderTextSettings = {},
) {
  return (await createSlideshowTextOverlay(slide, width, height, settings))
    .markup;
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
