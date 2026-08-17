import { readFile } from "node:fs/promises";
import { createElement, type ReactNode } from "react";
import satori from "satori";
import type { Font } from "satori";

import {
  slideshowHeadlineFontSize,
  slideshowOverlayTextColor,
  slideshowTextScale,
  wrapSlideshowText,
  type SlideshowRenderTextSettings,
  type SlideshowTextOverlaySlide,
} from "./text-overlay";

type OverlayStyle = Record<string, string | number | undefined>;

type FontFace = {
  name: string;
  weight: 400 | 600 | 700;
  style: "normal" | "italic";
  url: URL;
};

const FONT_FILES: FontFace[] = [
  {
    name: "Inter",
    weight: 400,
    style: "normal",
    url: new URL("./fonts/Inter-Regular.ttf", import.meta.url),
  },
  {
    name: "Inter",
    weight: 600,
    style: "normal",
    url: new URL("./fonts/Inter-SemiBold.ttf", import.meta.url),
  },
  {
    name: "Inter",
    weight: 700,
    style: "normal",
    url: new URL("./fonts/Inter-Bold.ttf", import.meta.url),
  },
  {
    name: "Inter",
    weight: 400,
    style: "italic",
    url: new URL("./fonts/Inter-Italic.ttf", import.meta.url),
  },
  {
    name: "Liberation Serif",
    weight: 400,
    style: "normal",
    url: new URL("./fonts/LiberationSerif-Regular.ttf", import.meta.url),
  },
  {
    name: "Liberation Serif",
    weight: 700,
    style: "normal",
    url: new URL("./fonts/LiberationSerif-Bold.ttf", import.meta.url),
  },
  {
    name: "Liberation Serif",
    weight: 400,
    style: "italic",
    url: new URL("./fonts/LiberationSerif-Italic.ttf", import.meta.url),
  },
  {
    name: "Liberation Mono",
    weight: 400,
    style: "normal",
    url: new URL("./fonts/LiberationMono-Regular.ttf", import.meta.url),
  },
  {
    name: "Liberation Mono",
    weight: 700,
    style: "normal",
    url: new URL("./fonts/LiberationMono-Bold.ttf", import.meta.url),
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
      data: await readFile(face.url),
      weight: face.weight,
      style: face.style,
    })),
  );
  return fontCache;
}

function overlayFont(settings: SlideshowRenderTextSettings) {
  const key = settings.font ?? "Poppins";
  if (key === "Mono") {
    return { fontFamily: "Liberation Mono", fontStyle: "normal" as const };
  }
  if (key === "Serif") {
    return { fontFamily: "Liberation Serif", fontStyle: "normal" as const };
  }
  if (key === "SerifItalic" || key === "Editorial") {
    return { fontFamily: "Liberation Serif", fontStyle: "italic" as const };
  }
  return { fontFamily: "Inter", fontStyle: "normal" as const };
}

function box(children: ReactNode, style: OverlayStyle): ReactNode {
  return createElement("div", { style }, children);
}

function pillLines(
  lines: string[],
  options: {
    fontSize: number;
    fontWeight: 400 | 600 | 700;
    color: string;
    background: string;
    radius: number;
    align: "left" | "center" | "right";
    letterSpacing?: number;
    opacity?: number;
    fontFamily: string;
    fontStyle: "normal" | "italic";
  },
) {
  const pad = Math.max(12, options.fontSize * 0.34);
  const alignSelf =
    options.align === "left"
      ? "flex-start"
      : options.align === "right"
        ? "flex-end"
        : "center";
  return lines.map((line, index) =>
    box(line, {
      display: "flex",
      alignSelf,
      alignItems: "center",
      backgroundColor: options.background,
      color: options.color,
      fontSize: options.fontSize,
      fontWeight: options.fontWeight,
      fontFamily: options.fontFamily,
      fontStyle: options.fontStyle,
      lineHeight: 1,
      height: options.fontSize * 1.29,
      paddingLeft: pad,
      paddingRight: pad,
      opacity: options.opacity ?? 1,
      letterSpacing: options.letterSpacing,
      borderTopLeftRadius: index === 0 ? options.radius : 0,
      borderTopRightRadius: index === 0 ? options.radius : 0,
      borderBottomLeftRadius: index === lines.length - 1 ? options.radius : 0,
      borderBottomRightRadius: index === lines.length - 1 ? options.radius : 0,
    }),
  );
}

function overlayTree(
  slide: SlideshowTextOverlaySlide,
  width: number,
  height: number,
  settings: SlideshowRenderTextSettings,
) {
  const copyRatio = Math.max(45, Math.min(100, settings.width ?? 88)) / 100;
  const copyWidth = width * copyRatio;
  const headlineSize = slideshowHeadlineFontSize(settings.size, width);
  const bodySize = Math.round(headlineSize * 0.46);
  const eyebrowSize = Math.round(headlineSize * 0.34);
  const style = settings.style ?? "outline";
  const align = settings.align ?? "center";
  const position = settings.position ?? "center";
  const inset = settings.padding === "flush" ? height * 0.035 : height * 0.13;
  const color = slideshowOverlayTextColor(settings.color);
  const { fontFamily, fontStyle } = overlayFont(settings);
  const condensed = settings.font === "Condensed";
  const hasPills = style === "solid" || style === "light";
  const renderedColor = style === "light" ? "#111111" : color;
  const radius =
    Math.max(0, Math.min(20, settings.backgroundRadius ?? 4)) *
    slideshowTextScale(width);
  const strokeWidth =
    style === "outline" ? Math.max(2.5, headlineSize * 0.052) : 0;
  const shadowBlur = Math.max(2.4, headlineSize * 0.018);
  const shadowOffset = Math.max(1.5, headlineSize * 0.014);
  const textShadow =
    style === "plain" || style === "outline"
      ? `0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,0.92), 0 ${shadowOffset * 2.3}px ${shadowBlur * 2.2}px rgba(0,0,0,0.5)`
      : undefined;
  const panelPadding = Math.max(24, headlineSize * 0.55);
  const justifyContent =
    position === "top"
      ? "flex-start"
      : position === "bottom"
        ? "flex-end"
        : "center";
  const alignItems =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  const textAlign = align;
  const layerGap = hasPills
    ? Math.max(8, headlineSize * 0.12)
    : Math.max(6, headlineSize * 0.08);
  const headlineMaxChars = Math.max(
    12,
    Math.floor(copyWidth / (headlineSize * 0.56)),
  );
  const bodyMaxChars = Math.max(18, Math.floor(copyWidth / (bodySize * 0.53)));
  const eyebrow = slide.eyebrow?.trim()
    ? slide.eyebrow.trim().toUpperCase()
    : "";
  const headline = slide.headline.trim();
  const body = (slide.body ?? "").trim();

  const typeStyle = (fontSize: number, fontWeight: 400 | 600 | 700): OverlayStyle => ({
    color: renderedColor,
    fontFamily,
    fontStyle,
    fontSize,
    fontWeight,
    textAlign,
    width: "100%",
    letterSpacing: condensed ? -headlineSize * 0.02 : undefined,
    textShadow,
    WebkitTextStrokeWidth: strokeWidth ? `${strokeWidth}px` : undefined,
    WebkitTextStrokeColor: strokeWidth ? "#09090b" : undefined,
  });

  const children: ReactNode[] = [];
  if (hasPills) {
    const background = style === "solid" ? "rgba(17,17,17,0.9)" : "#ffffff";
    if (eyebrow) {
      children.push(
        ...pillLines([eyebrow], {
          fontSize: eyebrowSize,
          fontWeight: 700,
          color: renderedColor,
          background,
          radius,
          align,
          letterSpacing: eyebrowSize * 0.12,
          opacity: 0.92,
          fontFamily,
          fontStyle,
        }),
      );
    }
    if (headline) {
      children.push(
        ...pillLines(wrapSlideshowText(headline, headlineMaxChars, 5), {
          fontSize: headlineSize,
          fontWeight: 700,
          color: renderedColor,
          background,
          radius,
          align,
          fontFamily,
          fontStyle,
        }),
      );
    }
    if (body) {
      children.push(
        ...pillLines(wrapSlideshowText(body, bodyMaxChars, 4), {
          fontSize: bodySize,
          fontWeight: 600,
          color: renderedColor,
          background,
          radius,
          align,
          opacity: 0.96,
          fontFamily,
          fontStyle,
        }),
      );
    }
  } else {
    if (eyebrow) {
      children.push(
        box(eyebrow, {
          ...typeStyle(eyebrowSize, 700),
          opacity: 0.92,
          letterSpacing: eyebrowSize * 0.12,
          lineHeight: 1.2,
        }),
      );
    }
    if (headline) {
      children.push(
        box(headline, {
          ...typeStyle(headlineSize, 700),
          lineHeight: 1.12,
          lineClamp: 5,
        }),
      );
    }
    if (body) {
      children.push(
        box(body, {
          ...typeStyle(bodySize, 600),
          opacity: 0.96,
          lineHeight: 1.42,
          lineClamp: 4,
        }),
      );
    }
  }

  const stack = box(children, {
    display: "flex",
    flexDirection: "column",
    width: copyWidth,
    alignItems,
    gap: layerGap,
    ...(style === "translucent"
      ? {
          backgroundColor: "rgba(17,17,17,0.58)",
          borderRadius: panelPadding * 0.55,
          padding: panelPadding,
        }
      : {}),
  });

  return box(stack, {
    display: "flex",
    width,
    height,
    flexDirection: "column",
    justifyContent,
    alignItems,
    paddingTop: inset,
    paddingBottom: inset,
    overflow: "hidden",
  });
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
