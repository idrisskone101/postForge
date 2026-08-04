"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

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

const previewFontFamilies: Record<SlideshowTextSettings["font"], string> = {
  Poppins: "var(--font-sans), Poppins, Avenir Next, Arial, sans-serif",
  Inter: "Inter, SF Pro Display, Helvetica Neue, Arial, sans-serif",
  Serif: "Georgia, Times New Roman, serif",
  Mono: "SFMono-Regular, Menlo, Courier New, monospace",
  Rounded: "Arial Rounded MT Bold, Trebuchet MS, Arial, sans-serif",
};

const colorClasses: Record<SlideshowTextSettings["color"], string> = {
  white: "text-white",
  black: "text-black",
  coral: "text-[#ff8a6e]",
  blue: "text-[#78b9e7]",
  yellow: "text-[#f7e27d]",
  custom: "",
};

const positionClasses: Record<SlideshowTextSettings["position"], string> = {
  top: "justify-start pt-[14%]",
  center: "justify-center",
  bottom: "justify-end pb-[14%]",
};

const alignClasses: Record<SlideshowTextSettings["align"], string> = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
};

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
  const textStyle = {
    width: `${textSettings.width}%`,
    "--slide-copy-size": `${textSettings.size}px`,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-2xl bg-zinc-900 text-white",
        aspectClasses[aspectRatio],
        className,
      )}
    >
      <GridMedia slide={slide} grid={phaseSettings.grid} />
      {phaseSettings.overlayEnabled ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black"
          style={{ opacity: phaseSettings.overlayOpacity / 100 }}
        />
      ) : null}
      {phaseSettings.displayText ? (
        <div
          className={cn(
            "absolute inset-0 z-10 flex flex-col px-[7%] py-[8%]",
            positionClasses[textSettings.position],
            alignClasses[textSettings.align],
            colorClasses[textSettings.color],
          )}
          style={{
            fontFamily: previewFontFamilies[textSettings.font],
            ...(textSettings.color === "custom"
              ? { color: textSettings.customColor ?? "#ffffff" }
              : {}),
          }}
        >
          <div
            className={cn(
              "flex flex-col",
              alignClasses[textSettings.align],
              textSettings.style === "solid" &&
                "rounded-xl bg-black px-4 py-3 text-white",
              textSettings.style === "translucent" &&
                "rounded-xl bg-black/55 px-4 py-3 text-white backdrop-blur-sm",
            )}
            style={textStyle}
          >
            <p className="text-[clamp(7px,1vw,11px)] font-semibold uppercase tracking-[0.16em] opacity-85">
              {slide.eyebrow}
            </p>
            <p
              className={cn(
                "mt-[5%] font-bold leading-[1.08]",
                textSettings.style === "outline" &&
                  "[text-shadow:0_2px_0_#111,0_-2px_0_#111,2px_0_0_#111,-2px_0_0_#111]",
              )}
              style={{ fontSize: "clamp(13px, calc(var(--slide-copy-size) * .72), var(--slide-copy-size))" }}
            >
              <span
                className="block overflow-hidden"
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 5,
                }}
              >
                {slide.headline}
              </span>
            </p>
            {slide.body ? (
              <p
                className="mt-[5%] overflow-hidden text-[clamp(8px,1.15vw,13px)] font-medium leading-[1.55] opacity-90"
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 4,
                }}
              >
                {slide.body}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {showCounter && counter ? (
        <span className="absolute bottom-3 right-3 z-20 rounded-full bg-black/55 px-2 py-1 text-[9px] font-semibold text-white backdrop-blur">
          {counter}
        </span>
      ) : null}
    </div>
  );
}

export function VisualTile({
  visualKey,
  className,
}: {
  visualKey: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("block bg-zinc-900", className)}
      style={{
        backgroundImage:
          visualBackgrounds[visualKey] ?? visualBackgrounds["coral-glow"],
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    />
  );
}

export function getAspectClass(aspectRatio: SlideshowAspectRatio) {
  return aspectClasses[aspectRatio];
}
