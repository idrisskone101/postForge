"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import {
  getSlideshowDimensions,
  parseSlideshowOverlayBoxes,
  SLIDESHOW_OVERLAY_BOXES_HEADER,
  SLIDESHOW_OVERLAY_LAYERS,
  type SlideshowOverlayBox,
  type SlideshowOverlayBoxes,
  type SlideshowOverlayLayer,
  type SlideshowRenderTextSettings,
} from "@/lib/slideshow/text-overlay";

import type {
  SlideshowAspectRatio,
  SlideshowGrid,
  SlideshowKindSettings,
  SlideshowSlide,
  SlideshowTextSettings,
} from "./types";

export function SlidePreview({
  slide,
  aspectRatio,
  phaseSettings,
  textSettings,
  className,
  showCounter,
  counter,
  focusLayer,
}: {
  slide: SlideshowSlide;
  aspectRatio: SlideshowAspectRatio;
  phaseSettings: SlideshowKindSettings;
  textSettings: SlideshowTextSettings;
  className?: string;
  showCounter?: boolean;
  counter?: string;
  /** The copy field that has focus. Only a preview that passes it (the editor stage) draws frames. */
  focusLayer?: SlideshowOverlayLayer | null;
}) {
  const { width, height } = getSlideshowDimensions(aspectRatio);
  const displayText = phaseSettings.displayText;
  const overlayKey = JSON.stringify({
    slide: {
      id: slide.id,
      eyebrow: slide.eyebrow,
      headline: slide.headline,
      body: slide.body,
    },
    width,
    height,
    settings: overlayTextSettings(textSettings),
  });
  const [fetchedOverlay, setFetchedOverlay] = useState<
    (PreviewOverlay & { key: string; slideId: string }) | null
  >(null);
  const overlay = displayText
    ? overlayCache.get(overlayKey) ??
      (fetchedOverlay?.key === overlayKey ? fetchedOverlay : null)
    : null;
  const overlaySrc = overlay?.src ?? null;
  // While the next render of the same slide is on its way the frame keeps its last place, so it
  // does not blink on every keystroke.
  const frameBoxes =
    displayText && focusLayer !== undefined
      ? overlay?.boxes ??
        (fetchedOverlay?.slideId === slide.id ? fetchedOverlay.boxes : null)
      : null;

  useEffect(() => {
    if (!displayText) return;
    if (overlayCache.has(overlayKey)) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/slideshows/overlay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: overlayKey,
            signal: controller.signal,
          });
          if (!response.ok) return;
          const svg = (await response.text()).trim();
          if (!svg.includes('data-slideshow-text-overlay="true"')) return;
          const fetched = {
            src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
            boxes: parseSlideshowOverlayBoxes(
              response.headers.get(SLIDESHOW_OVERLAY_BOXES_HEADER),
            ),
          };
          rememberOverlay(overlayKey, fetched);
          if (!controller.signal.aborted) {
            setFetchedOverlay({ ...fetched, key: overlayKey, slideId: slide.id });
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      })();
    }, 60);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [displayText, overlayKey, slide.id]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-lg bg-[#09090B] text-white",
        className,
      )}
    >
      <div
        data-slide-canvas=""
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <GridMedia slide={slide} grid={phaseSettings.grid} />
        {phaseSettings.overlayEnabled ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black"
            style={{ opacity: phaseSettings.overlayOpacity / 100 }}
          />
        ) : null}
        {displayText ? (
          <div
            aria-hidden="true"
            data-slideshow-text-overlay=""
            className="pointer-events-none absolute inset-0"
            style={
              overlaySrc
                ? {
                    backgroundImage: `url(${JSON.stringify(overlaySrc)})`,
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "contain",
                  }
                : undefined
            }
          />
        ) : null}
        {frameBoxes
          ? SLIDESHOW_OVERLAY_LAYERS.map((layer) => {
              const box = frameBoxes[layer];
              if (!box || !onCanvas(box, width, height)) return null;
              return (
                <span
                  key={layer}
                  aria-hidden="true"
                  data-copy-frame={layer}
                  data-active={focusLayer === layer || undefined}
                  className="wb-copy-frame"
                  style={frameInsets(box, frameBoxes, width, height)}
                />
              );
            })
          : null}
      </div>
      {showCounter && counter ? (
        <span className="wb-mono absolute bottom-3 right-3 z-20 rounded-full bg-[var(--pf-scrim)] px-2 py-1 text-[var(--pf-on-media)]">
          {counter}
        </span>
      ) : null}
    </div>
  );
}

const visualBackgrounds: Record<string, string> = {
  "coral-glow":
    "radial-gradient(circle at 74% 18%, rgba(255,225,198,.9), transparent 24%), radial-gradient(circle at 18% 78%, rgba(112,28,54,.6), transparent 34%), linear-gradient(145deg, #fc8f6d 0%, #d84a58 52%, #472044 100%)",
  "blue-studio":
    "radial-gradient(circle at 20% 22%, rgba(170,224,255,.78), transparent 25%), radial-gradient(circle at 76% 75%, rgba(50,75,166,.76), transparent 32%), linear-gradient(150deg, #143b62 0%, #317aa7 50%, #111d45 100%)",
  "night-grid":
    "linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px), radial-gradient(circle at 50% 40%, #7355a4, #19182c 64%)",
  "lime-paper":
    "radial-gradient(circle at 73% 27%, rgba(255,255,225,.78), transparent 20%), linear-gradient(145deg, #dce878 0%, #8faf58 50%, #39584a 100%)",
  "violet-dusk":
    "radial-gradient(circle at 30% 24%, rgba(255,173,210,.66), transparent 24%), linear-gradient(155deg, #6f4f8d 0%, #433360 48%, #181b38 100%)",
  "mint-room":
    "radial-gradient(circle at 75% 18%, rgba(228,255,236,.92), transparent 27%), linear-gradient(145deg, #93d6b7 0%, #4c9c8d 51%, #244f62 100%)",
  "paper-stack":
    "linear-gradient(130deg, transparent 0 26%, rgba(255,255,255,.22) 27% 46%, transparent 47%), linear-gradient(150deg, #d7b895 0%, #9e705d 46%, #4d3240 100%)",
  "sunset-blocks":
    "linear-gradient(90deg, rgba(255,255,255,.13) 0 33%, transparent 33% 66%, rgba(69,21,72,.24) 66%), linear-gradient(145deg, #ffbf72, #ed6b66 52%, #71385d)",
  "coral-wave":
    "radial-gradient(ellipse at 24% 72%, rgba(255,224,177,.7), transparent 30%), radial-gradient(ellipse at 76% 34%, rgba(135,29,73,.56), transparent 34%), linear-gradient(135deg, #ff8b68, #bf4260 57%, #3a254d)",
};

const aspectClasses: Record<SlideshowAspectRatio, string> = {
  "9:16": "aspect-[9/16]",
  "4:5": "aspect-[4/5]",
  "1:1": "aspect-square",
  "16:9": "aspect-video",
};

type PreviewOverlay = { src: string; boxes: SlideshowOverlayBoxes };

// The frame sits 8px beside the copy and 4px above and below it. On a small canvas the blocks sit
// closer than that, so the frame takes at most half the gap to the next block and leaves its lines.
function frameInsets(
  box: SlideshowOverlayBox,
  boxes: SlideshowOverlayBoxes,
  width: number,
  height: number,
) {
  let above = Infinity;
  let below = Infinity;
  for (const other of Object.values(boxes)) {
    if (!other || other === box) continue;
    if (other.y + other.height <= box.y) above = Math.min(above, box.y - other.y - other.height);
    if (other.y >= box.y + box.height) below = Math.min(below, other.y - box.y - box.height);
  }
  const outset = (gap: number) =>
    Number.isFinite(gap) ? `min(4px, ${(gap / 2 / height) * 100}%)` : "4px";
  return {
    left: `max(2px, calc(${(box.x / width) * 100}% - 8px))`,
    top: `max(2px, calc(${(box.y / height) * 100}% - ${outset(above)}))`,
    right: `max(2px, calc(${(1 - (box.x + box.width) / width) * 100}% - 8px))`,
    bottom: `max(2px, calc(${(1 - (box.y + box.height) / height) * 100}% - ${outset(below)}))`,
  };
}

// Copy that runs past the canvas is cut off by it. The renderer reports one box per block, sized by
// its widest line, so a block with lines off the canvas would get a frame wider than what is shown.
// Only a block wholly on the canvas is framed.
function onCanvas(box: SlideshowOverlayBox, width: number, height: number) {
  const EDGE = 1;
  return (
    box.width > 0 &&
    box.height > 0 &&
    box.x >= -EDGE &&
    box.y >= -EDGE &&
    box.x + box.width <= width + EDGE &&
    box.y + box.height <= height + EDGE
  );
}

const overlayCache = new Map<string, PreviewOverlay>();
const OVERLAY_CACHE_LIMIT = 40;

function rememberOverlay(key: string, overlay: PreviewOverlay) {
  if (overlayCache.size >= OVERLAY_CACHE_LIMIT) {
    const oldest = overlayCache.keys().next().value;
    if (oldest) overlayCache.delete(oldest);
  }
  overlayCache.set(key, overlay);
}

function overlayTextSettings(
  textSettings: SlideshowTextSettings,
): SlideshowRenderTextSettings {
  return {
    font: textSettings.font,
    color:
      textSettings.color === "custom"
        ? (textSettings.customColor ?? "#ffffff")
        : textSettings.color,
    style: textSettings.style,
    size: textSettings.size,
    position: textSettings.position,
    width: textSettings.width,
    align: textSettings.align,
    padding: textSettings.padding,
    backgroundRadius: textSettings.backgroundRadius,
  };
}

function GridMedia({ slide, grid }: { slide: SlideshowSlide; grid: SlideshowGrid }) {
  const count = grid === "1:3" ? 3 : grid === "2:2" ? 4 : grid === "none" ? 1 : 2;
  const fallbackKeys = [
    slide.visualKey,
    "blue-studio",
    "lime-paper",
    "violet-dusk",
  ];
  const visualKeys = slide.visualKeys?.length ? slide.visualKeys : fallbackKeys;
  const imageUrls = slide.imageUrls?.length
    ? slide.imageUrls
    : slide.imageUrl
      ? [slide.imageUrl]
      : [];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 grid gap-px bg-black",
        grid === "1:2" && "grid-cols-2",
        grid === "1:3" && "grid-cols-3",
        grid === "2:1" && "grid-rows-2",
        grid === "2:2" && "grid-cols-2 grid-rows-2",
      )}
    >
      {Array.from({ length: count }, (_, index) => {
        const imageUrl = imageUrls[index];
        const visualKey = visualKeys[index] ?? fallbackKeys[index] ?? slide.visualKey;
        return (
          <span
            key={`${imageUrl ?? visualKey}-${index}`}
            className="block min-h-0 min-w-0 bg-[#09090B]"
            style={{
              backgroundImage: imageUrl
                ? `url(${JSON.stringify(imageUrl)})`
                : (visualBackgrounds[visualKey] ?? visualBackgrounds["coral-glow"]),
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
        );
      })}
    </div>
  );
}

export function VisualTile({
  visualKey,
  imageUrl,
  className,
}: {
  visualKey: string;
  imageUrl?: string | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("block bg-[#09090B]", className)}
      style={{
        backgroundImage: imageUrl
          ? `url(${JSON.stringify(imageUrl)})`
          : (visualBackgrounds[visualKey] ?? visualBackgrounds["coral-glow"]),
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    />
  );
}

export function getAspectClass(aspectRatio: SlideshowAspectRatio) {
  return aspectClasses[aspectRatio];
}
