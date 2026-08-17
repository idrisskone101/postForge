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

const overlayFontFamilies: Record<string, string> = {
  Poppins: "Poppins, Avenir Next, Arial, sans-serif",
  Inter: "Inter, SF Pro Display, Helvetica Neue, Arial, sans-serif",
  Serif: "Georgia, Times New Roman, serif",
  SerifItalic: "Georgia, Times New Roman, serif",
  Editorial: "Baskerville, Palatino Linotype, Times New Roman, serif",
  Condensed: "DejaVu Sans, Arial Narrow, Helvetica Neue, sans-serif",
  Mono: "SFMono-Regular, Menlo, Courier New, monospace",
  Rounded: "Arial Rounded MT Bold, Trebuchet MS, Arial, sans-serif",
};

export function getSlideshowDimensions(aspectRatio: string) {
  return SLIDESHOW_ASPECT_DIMENSIONS[aspectRatio] ?? SLIDESHOW_ASPECT_DIMENSIONS["9:16"];
}

export function slideshowTextScale(canvasWidth: number) {
  return canvasWidth / SLIDESHOW_TEXT_REFERENCE_WIDTH;
}

export function slideshowHeadlineFontSize(
  size: number | undefined,
  canvasWidth: number,
) {
  const configured =
    typeof size === "number" && Number.isFinite(size) ? size : 28;
  return configured * slideshowTextScale(canvasWidth);
}

function xml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value: string, maxCharacters: number, maxLines: number) {
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

function textColor(value = "white") {
  const colors: Record<string, string> = {
    white: "#ffffff",
    black: "#111111",
    coral: "#ff8a6e",
    blue: "#78b9e7",
    yellow: "#f7e27d",
  };
  return colors[value] ?? (/^#[\da-f]{3,8}$/i.test(value) ? value : "#ffffff");
}

function overlayFilterId(slideId: string) {
  const safe = slideId.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const trimmed = safe.replace(/^[^a-zA-Z]+/, "") || "slide";
  return `slideshow-text-shadow-${trimmed}`;
}

export function createSlideshowTextOverlayMarkup(
  slide: SlideshowTextOverlaySlide,
  width: number,
  height: number,
  settings: SlideshowRenderTextSettings,
) {
  const safeWidth = Math.max(45, Math.min(100, settings.width ?? 88)) / 100;
  const copyWidth = width * safeWidth;
  const previewScale = slideshowTextScale(width);
  const headlineSize = slideshowHeadlineFontSize(settings.size, width);
  const bodySize = Math.round(headlineSize * 0.46);
  const eyebrowSize = Math.round(headlineSize * 0.34);
  const headlineLines = wrapText(
    slide.headline,
    Math.max(12, Math.floor(copyWidth / (headlineSize * 0.56))),
    5,
  );
  const bodyLines = wrapText(
    slide.body ?? "",
    Math.max(18, Math.floor(copyWidth / (bodySize * 0.53))),
    4,
  );
  const style = settings.style ?? "outline";
  const hasLineBackground = style === "solid" || style === "light";
  const stackedBlockHeight = (count: number, fontSize: number) =>
    count ? fontSize * count * 1.29 : 0;
  const eyebrowHeight = slide.eyebrow
    ? hasLineBackground
      ? stackedBlockHeight(1, eyebrowSize)
      : eyebrowSize * 2
    : 0;
  const headlineHeight = hasLineBackground
    ? stackedBlockHeight(headlineLines.length, headlineSize)
    : headlineLines.length * headlineSize * 1.12;
  const bodyHeight = hasLineBackground
    ? stackedBlockHeight(bodyLines.length, bodySize)
    : bodyLines.length
      ? bodyLines.length * bodySize * 1.45 + bodySize
      : 0;
  const visibleLayerCount =
    Number(Boolean(slide.eyebrow)) +
    Number(headlineLines.length > 0) +
    Number(bodyLines.length > 0);
  const layerGap = hasLineBackground ? Math.max(8, headlineSize * 0.12) : 0;
  const totalHeight =
    eyebrowHeight +
    headlineHeight +
    bodyHeight +
    Math.max(0, visibleLayerCount - 1) * layerGap;
  const position = settings.position ?? "center";
  const safeInset = settings.padding === "flush" ? height * 0.035 : height * 0.13;
  const top =
    position === "top"
      ? safeInset
      : position === "bottom"
        ? height - totalHeight - safeInset
        : (height - totalHeight) / 2;
  const align = settings.align ?? "center";
  const x =
    align === "left"
      ? (width - copyWidth) / 2
      : align === "right"
        ? width - (width - copyWidth) / 2
        : width / 2;
  const anchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  const color = textColor(settings.color);
  const fontFamily =
    overlayFontFamilies[settings.font ?? "Poppins"] ?? overlayFontFamilies.Poppins;
  const fontStyle =
    settings.font === "SerifItalic" || settings.font === "Editorial"
      ? "italic"
      : "normal";
  const fontStretch = settings.font === "Condensed" ? "condensed" : "normal";
  const lineWidthFactor =
    settings.font === "Condensed"
      ? 0.46
      : settings.font === "Editorial"
        ? 0.64
        : settings.font === "SerifItalic"
          ? 0.6
          : 0.55;
  const panelOpacity = style === "translucent" ? 0.58 : 0;
  const padding = Math.max(24, headlineSize * 0.55);
  const panelX = (width - copyWidth) / 2 - padding;
  const panelY = top - padding;
  const panelWidth = copyWidth + padding * 2;
  const panelHeight = totalHeight + padding * 2;
  const stroke = style === "outline" ? "#09090b" : "none";
  const strokeWidth = style === "outline" ? Math.max(2.5, headlineSize * 0.052) : 0;
  const renderedColor = style === "light" ? "#111111" : color;
  const filterId = overlayFilterId(slide.id);
  const shadowFilter =
    style === "plain" || style === "outline" ? ` filter="url(#${filterId})"` : "";
  const backgroundFill = style === "solid" ? "#111111" : style === "light" ? "#ffffff" : null;
  const backgroundOpacity = style === "solid" ? 0.9 : 0.96;
  const backgroundRadius =
    Math.max(0, Math.min(20, settings.backgroundRadius ?? 4)) * previewScale;
  const fontAttributes = `font-family="${fontFamily}" font-style="${fontStyle}" font-stretch="${fontStretch}"`;

  const roundedRectPath = (
    left: number,
    topEdge: number,
    boxWidth: number,
    boxHeight: number,
    topRadius: number,
    bottomRadius: number,
  ) => {
    const topCorner = Math.max(
      0,
      Math.min(topRadius, boxWidth / 2, boxHeight / 2),
    );
    const bottomCorner = Math.max(
      0,
      Math.min(bottomRadius, boxWidth / 2, boxHeight / 2),
    );
    const right = left + boxWidth;
    const bottom = topEdge + boxHeight;
    return [
      `M ${left + topCorner} ${topEdge}`,
      `H ${right - topCorner}`,
      `Q ${right} ${topEdge} ${right} ${topEdge + topCorner}`,
      `V ${bottom - bottomCorner}`,
      `Q ${right} ${bottom} ${right - bottomCorner} ${bottom}`,
      `H ${left + bottomCorner}`,
      `Q ${left} ${bottom} ${left} ${bottom - bottomCorner}`,
      `V ${topEdge + topCorner}`,
      `Q ${left} ${topEdge} ${left + topCorner} ${topEdge}`,
      "Z",
    ].join(" ");
  };

  const stackedLineWidth = (
    line: string,
    fontSize: number,
    widthFactor: number,
  ) => {
    const horizontalPadding = Math.max(12, fontSize * 0.34);
    return Math.min(
      copyWidth,
      Math.max(fontSize * 1.5, line.length * fontSize * widthFactor) +
        horizontalPadding * 2,
    );
  };

  let cursor = top;
  const chunks: string[] = [];
  const renderStackedLines = (
    lines: string[],
    fontSize: number,
    widthFactor: number,
    fontWeight: number,
    opacity = 1,
    letterSpacing = 0,
  ) => {
    const widths = lines.map((line) =>
      stackedLineWidth(line, fontSize, widthFactor),
    );
    lines.forEach((line, index) => {
      const boxHeight = fontSize * 1.29;
      const boxWidth = widths[index];
      const topRadius = index === 0 ? backgroundRadius : 0;
      const bottomRadius =
        index === lines.length - 1 ? backgroundRadius : 0;
      const boxX =
        anchor === "start"
          ? x
          : anchor === "end"
            ? x - boxWidth
            : x - boxWidth / 2;
      const horizontalPadding = Math.max(12, fontSize * 0.34);
      const textX =
        anchor === "start"
          ? x + horizontalPadding
          : anchor === "end"
            ? x - horizontalPadding
            : x;
      const baseline = cursor + fontSize;
      chunks.push(
        `<path data-line-box="true" data-y="${cursor}" data-height="${boxHeight}" data-width="${boxWidth}" data-radius="${backgroundRadius}" data-top-radius="${topRadius}" data-bottom-radius="${bottomRadius}" d="${roundedRectPath(boxX, cursor, boxWidth, boxHeight, topRadius, bottomRadius)}" fill="${backgroundFill}" opacity="${backgroundOpacity}"/>`,
        `<text x="${textX}" y="${baseline}" text-anchor="${anchor}" ${fontAttributes} font-size="${fontSize}" font-weight="${fontWeight}"${letterSpacing ? ` letter-spacing="${letterSpacing}"` : ""} fill="${renderedColor}" opacity="${opacity}">${xml(line)}</text>`,
      );
      cursor += boxHeight;
    });
  };

  if (hasLineBackground) {
    if (slide.eyebrow) {
      renderStackedLines(
        [slide.eyebrow.toUpperCase()],
        eyebrowSize,
        Math.max(0.65, lineWidthFactor + 0.1),
        700,
        0.92,
        eyebrowSize * 0.12,
      );
      if (headlineLines.length || bodyLines.length) cursor += layerGap;
    }
    renderStackedLines(headlineLines, headlineSize, lineWidthFactor, 800);
    if (headlineLines.length && bodyLines.length) cursor += layerGap;
    renderStackedLines(bodyLines, bodySize, lineWidthFactor + 0.02, 600, 0.96);
  } else {
    if (slide.eyebrow) {
      const baseline = cursor + eyebrowSize;
      chunks.push(
        `<text x="${x}" y="${baseline}" text-anchor="${anchor}" ${fontAttributes} font-size="${eyebrowSize}" font-weight="700" letter-spacing="${eyebrowSize * 0.12}" fill="${renderedColor}" opacity=".92"${shadowFilter}>${xml(slide.eyebrow.toUpperCase())}</text>`,
      );
      cursor += eyebrowHeight;
    }
    headlineLines.forEach((line, index) => {
      const baseline = cursor + headlineSize * 1.12 * (index + 1);
      chunks.push(
        `<text x="${x}" y="${baseline}" text-anchor="${anchor}" ${fontAttributes} font-size="${headlineSize}" font-weight="800" fill="${renderedColor}" stroke="${stroke}" stroke-width="${strokeWidth}" paint-order="stroke fill" stroke-linejoin="round"${shadowFilter}>${xml(line)}</text>`,
      );
    });
    cursor += headlineHeight + (bodyLines.length ? bodySize : 0);
    bodyLines.forEach((line, index) => {
      const baseline = cursor + bodySize * 1.42 * (index + 1);
      chunks.push(
        `<text x="${x}" y="${baseline}" text-anchor="${anchor}" ${fontAttributes} font-size="${bodySize}" font-weight="600" fill="${renderedColor}" opacity=".96"${shadowFilter}>${xml(line)}</text>`,
      );
    });
  }

  const shadowBlur = Math.max(2.4, headlineSize * 0.018);
  const shadowOffset = Math.max(1.5, headlineSize * 0.014);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" data-slideshow-text-overlay="true" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
      <defs>
        <filter id="${filterId}" x="-30%" y="-30%" width="160%" height="170%" color-interpolation-filters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="${shadowBlur}" result="near-blur"/>
          <feOffset in="near-blur" dx="0" dy="${shadowOffset}" result="near-offset"/>
          <feFlood flood-color="#000000" flood-opacity="0.92" result="near-color"/>
          <feComposite in="near-color" in2="near-offset" operator="in" result="near-shadow"/>
          <feGaussianBlur in="SourceAlpha" stdDeviation="${shadowBlur * 2.2}" result="far-blur"/>
          <feOffset in="far-blur" dx="0" dy="${shadowOffset * 2.3}" result="far-offset"/>
          <feFlood flood-color="#000000" flood-opacity="0.5" result="far-color"/>
          <feComposite in="far-color" in2="far-offset" operator="in" result="far-shadow"/>
          <feMerge>
            <feMergeNode in="far-shadow"/>
            <feMergeNode in="near-shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      ${panelOpacity ? `<rect x="${panelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" rx="${padding * 0.55}" fill="#111" opacity="${panelOpacity}"/>` : ""}
      ${chunks.join("")}
    </svg>
  `;
}
