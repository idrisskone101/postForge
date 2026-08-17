"use client";

import { cn } from "@/lib/utils";
import {
  createSlideshowTextOverlayMarkup,
  getSlideshowDimensions,
  type SlideshowRenderTextSettings,
} from "@/lib/slideshow/text-overlay";

import type {
  SlideshowAspectRatio,
  SlideshowGrid,
  SlideshowPhaseSettings,
  SlideshowSlide,
  SlideshowTextSettings,
} from "./types";

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
            className="block min-h-0 min-w-0 bg-zinc-900"
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

export function SlidePreview({
  slide,
  aspectRatio,
  phaseSettings,
  textSettings,
  className,
  showCounter,
  counter,
}: {
  slide: SlideshowSlide;
  aspectRatio: SlideshowAspectRatio;
  phaseSettings: SlideshowPhaseSettings;
  textSettings: SlideshowTextSettings;
  className?: string;
  showCounter?: boolean;
  counter?: string;
}) {
  const { width, height } = getSlideshowDimensions(aspectRatio);
  const overlayMarkup = phaseSettings.displayText
    ? createSlideshowTextOverlayMarkup(
        slide,
        width,
        height,
        overlayTextSettings(textSettings),
      )
    : null;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[10px] bg-zinc-900 text-white [container-type:inline-size]",
        className,
      )}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <div
        data-slide-stage=""
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width,
          height,
          transform: `scale(calc(100cqw / ${width}))`,
        }}
      >
        <GridMedia slide={slide} grid={phaseSettings.grid} />
        {phaseSettings.overlayEnabled ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black"
            style={{ opacity: phaseSettings.overlayOpacity / 100 }}
          />
        ) : null}
        {overlayMarkup ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            dangerouslySetInnerHTML={{ __html: overlayMarkup }}
          />
        ) : null}
      </div>
      {showCounter && counter ? (
        <span className="absolute bottom-3 right-3 z-20 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {counter}
        </span>
      ) : null}
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
      className={cn("block bg-zinc-900", className)}
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
