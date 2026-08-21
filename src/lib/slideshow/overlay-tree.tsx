import { createElement, type ReactNode } from "react";

import {
  slideshowHeadlineFontSize,
  slideshowOverlayTextColor,
  slideshowTextScale,
  wrapSlideshowText,
  type SlideshowRenderTextSettings,
  type SlideshowTextOverlaySlide,
} from "./text-overlay";

type OverlayStyle = Record<string, string | number | undefined>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const JUSTIFY = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end",
} as const;

const ITEMS = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const;

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

function overlayLayout(
  width: number,
  height: number,
  settings: SlideshowRenderTextSettings,
) {
  const style = settings.style ?? "outline";
  const align = settings.align ?? "center";
  const headline = slideshowHeadlineFontSize(settings.size, width);
  const copyWidth = width * (clamp(settings.width ?? 88, 45, 100) / 100);
  const pills = style === "solid" || style === "light";
  const color =
    style === "light" ? "#111111" : slideshowOverlayTextColor(settings.color);
  const stroke = style === "outline" ? Math.max(2.5, headline * 0.052) : 0;
  const shadow = Math.max(1.5, headline * 0.014);
  const blur = Math.max(2.4, headline * 0.018);
  const font = overlayFont(settings);
  const textShadow =
    style === "plain" || style === "outline"
      ? `0 ${shadow}px ${blur}px rgba(0,0,0,0.92), 0 ${shadow * 2.3}px ${blur * 2.2}px rgba(0,0,0,0.5)`
      : undefined;
  return {
    style,
    align,
    pills,
    color,
    copyWidth,
    headline,
    body: Math.round(headline * 0.46),
    eyebrow: Math.round(headline * 0.34),
    radius:
      clamp(settings.backgroundRadius ?? 4, 0, 20) * slideshowTextScale(width),
    inset: settings.padding === "flush" ? height * 0.035 : height * 0.13,
    gap: Math.max(pills ? 8 : 6, headline * (pills ? 0.12 : 0.08)),
    panel: Math.max(24, headline * 0.55),
    justifyContent: JUSTIFY[settings.position ?? "center"],
    alignItems: ITEMS[align],
    font,
    wrapChars(size: number, em: number, floor: number) {
      return Math.max(floor, Math.floor(copyWidth / (size * em)));
    },
    typeStyle(fontSize: number, fontWeight: 400 | 600 | 700): OverlayStyle {
      return {
        color,
        ...font,
        fontSize,
        fontWeight,
        textAlign: align,
        width: "100%",
        letterSpacing:
          settings.font === "Condensed" ? -headline * 0.02 : undefined,
        textShadow,
        WebkitTextStrokeWidth: stroke ? `${stroke}px` : undefined,
        WebkitTextStrokeColor: stroke ? "#09090b" : undefined,
      };
    },
  };
}

function cleanStyle(style: OverlayStyle): OverlayStyle {
  return Object.fromEntries(
    Object.entries(style).filter(([, value]) => value !== undefined),
  );
}

function box(children: ReactNode, style: OverlayStyle): ReactNode {
  return createElement("div", { style: cleanStyle(style) }, children);
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
  return lines.map((line, index) =>
    box(line, {
      display: "flex",
      alignSelf: ITEMS[options.align],
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

function overlayCopy(slide: SlideshowTextOverlaySlide) {
  return {
    eyebrow: slide.eyebrow?.trim() ? slide.eyebrow.trim().toUpperCase() : "",
    headline: slide.headline.trim(),
    body: (slide.body ?? "").trim(),
  };
}

function overlayLayers(
  copy: ReturnType<typeof overlayCopy>,
  layout: ReturnType<typeof overlayLayout>,
) {
  if (layout.pills) {
    const background =
      layout.style === "solid" ? "rgba(17,17,17,0.9)" : "#ffffff";
    const pill = (
      lines: string[],
      fontSize: number,
      fontWeight: 400 | 600 | 700,
      extra: { letterSpacing?: number; opacity?: number } = {},
    ) =>
      pillLines(lines, {
        fontSize,
        fontWeight,
        color: layout.color,
        background,
        radius: layout.radius,
        align: layout.align,
        fontFamily: layout.font.fontFamily,
        fontStyle: layout.font.fontStyle,
        ...extra,
      });
    return [
      ...(copy.eyebrow
        ? pill([copy.eyebrow], layout.eyebrow, 700, {
            letterSpacing: layout.eyebrow * 0.12,
            opacity: 0.92,
          })
        : []),
      ...(copy.headline
        ? pill(
            wrapSlideshowText(
              copy.headline,
              layout.wrapChars(layout.headline, 0.56, 12),
              5,
            ),
            layout.headline,
            700,
          )
        : []),
      ...(copy.body
        ? pill(
            wrapSlideshowText(
              copy.body,
              layout.wrapChars(layout.body, 0.53, 18),
              4,
            ),
            layout.body,
            600,
            { opacity: 0.96 },
          )
        : []),
    ];
  }

  return [
    copy.eyebrow
      ? box(copy.eyebrow, {
          ...layout.typeStyle(layout.eyebrow, 700),
          opacity: 0.92,
          letterSpacing: layout.eyebrow * 0.12,
          lineHeight: 1.2,
        })
      : null,
    copy.headline
      ? box(copy.headline, {
          ...layout.typeStyle(layout.headline, 700),
          lineHeight: 1.12,
          lineClamp: 5,
        })
      : null,
    copy.body
      ? box(copy.body, {
          ...layout.typeStyle(layout.body, 600),
          opacity: 0.96,
          lineHeight: 1.42,
          lineClamp: 4,
        })
      : null,
  ].filter(Boolean);
}

export function overlayTree(
  slide: SlideshowTextOverlaySlide,
  width: number,
  height: number,
  settings: SlideshowRenderTextSettings,
) {
  const layout = overlayLayout(width, height, settings);
  return box(
    box(overlayLayers(overlayCopy(slide), layout), {
      display: "flex",
      flexDirection: "column",
      width: layout.copyWidth,
      alignItems: layout.alignItems,
      gap: layout.gap,
      ...(layout.style === "translucent"
        ? {
            backgroundColor: "rgba(17,17,17,0.58)",
            borderRadius: layout.panel * 0.55,
            padding: layout.panel,
          }
        : {}),
    }),
    {
      display: "flex",
      width,
      height,
      flexDirection: "column",
      justifyContent: layout.justifyContent,
      alignItems: layout.alignItems,
      paddingTop: layout.inset,
      paddingBottom: layout.inset,
      overflow: "hidden",
    },
  );
}
