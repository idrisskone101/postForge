"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
  SerifItalic: "Georgia, Times New Roman, serif",
  Editorial: "Baskerville, Palatino Linotype, Times New Roman, serif",
  Condensed: "Arial Narrow, Helvetica Neue, Arial, sans-serif",
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

function BackgroundTextBlock({
  text,
  maxLines,
  radius,
  backgroundFill,
  textClassName,
  className,
  style,
}: {
  text: string;
  maxLines: number;
  radius: number;
  backgroundFill: string;
  textClassName: string;
  className: string;
  style?: CSSProperties;
}) {
  const blockRef = useRef<HTMLParagraphElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fragmentPath, setFragmentPath] = useState("");

  useLayoutEffect(() => {
    const block = blockRef.current;
    const textElement = textRef.current;
    if (!block || !textElement) return;

    let active = true;
    const measure = () => {
      if (!active) return;
      const blockRect = block.getBoundingClientRect();
      const fragments = [...textElement.getClientRects()]
        .filter(
          (rect) =>
            rect.width > 0 &&
            rect.height > 0 &&
            rect.top < blockRect.bottom - 0.5,
        )
        .slice(0, maxLines)
        .map((rect) => ({
          bottom: rect.bottom - blockRect.top,
          left: rect.left - blockRect.left,
          right: rect.right - blockRect.left,
          top: rect.top - blockRect.top,
        }));

      if (!fragments.length) {
        setFragmentPath("");
        return;
      }

      const first = fragments[0];
      const last = fragments[fragments.length - 1];
      const topRadius = Math.max(
        0,
        Math.min(radius, (first.right - first.left) / 2, (first.bottom - first.top) / 2),
      );
      const bottomRadius = Math.max(
        0,
        Math.min(radius, (last.right - last.left) / 2, (last.bottom - last.top) / 2),
      );
      const commands = [
        `M ${first.left + topRadius} ${first.top}`,
        `H ${first.right - topRadius}`,
        `Q ${first.right} ${first.top} ${first.right} ${first.top + topRadius}`,
      ];

      fragments.forEach((fragment, index) => {
        commands.push(
          `V ${index === fragments.length - 1 ? fragment.bottom - bottomRadius : fragment.bottom}`,
        );
        const next = fragments[index + 1];
        if (next) commands.push(`H ${next.right}`);
      });
      commands.push(
        `Q ${last.right} ${last.bottom} ${last.right - bottomRadius} ${last.bottom}`,
        `H ${last.left + bottomRadius}`,
        `Q ${last.left} ${last.bottom} ${last.left} ${last.bottom - bottomRadius}`,
      );
      for (let index = fragments.length - 1; index >= 0; index -= 1) {
        const fragment = fragments[index];
        commands.push(
          `V ${index === 0 ? fragment.top + topRadius : fragment.top}`,
        );
        const previous = fragments[index - 1];
        if (previous) commands.push(`H ${previous.left}`);
      }
      commands.push(
        `Q ${first.left} ${first.top} ${first.left + topRadius} ${first.top}`,
        "Z",
      );
      const nextPath = commands.join(" ");
      setFragmentPath((current) => (current === nextPath ? current : nextPath));
    };

    const observer = new ResizeObserver(measure);
    observer.observe(block);
    observer.observe(textElement);
    measure();
    void document.fonts?.ready.then(measure);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [maxLines, radius, text]);

  return (
    <p
      ref={blockRef}
      className={cn(
        "relative box-border w-full max-w-full overflow-hidden",
        textClassName,
        className,
      )}
      style={{
        ...style,
        display: "-webkit-box",
        lineHeight: 1.29,
        paddingInline: "0.34em",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: maxLines,
      }}
    >
      {fragmentPath ? (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 size-full overflow-visible"
        >
          <path d={fragmentPath} fill={backgroundFill} />
        </svg>
      ) : null}
      <span
        ref={textRef}
        className="relative z-10 box-decoration-clone"
        style={{
          WebkitBoxDecorationBreak: "clone",
          boxDecorationBreak: "clone",
          paddingInline: "0.34em",
        }}
      >
        {text}
      </span>
    </p>
  );
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
  const textStyle = {
    width: `${textSettings.width}%`,
    "--slide-copy-size": `${textSettings.size}px`,
    fontStyle:
      textSettings.font === "SerifItalic" || textSettings.font === "Editorial"
        ? "italic"
        : "normal",
    fontStretch: textSettings.font === "Condensed" ? "condensed" : "normal",
  } as CSSProperties;
  const hasSmoothShadow =
    textSettings.style === "plain" || textSettings.style === "outline";
  const textEffectStyle = {
    ...(hasSmoothShadow
      ? {
          textShadow:
            "0 1px 1px rgba(0,0,0,.96), 0 2px 4px rgba(0,0,0,.78), 0 6px 14px rgba(0,0,0,.52)",
        }
      : {}),
    ...(textSettings.style === "outline"
      ? {
          WebkitTextStroke: "clamp(.65px, .055em, 1.6px) rgba(9,9,11,.96)",
          paintOrder: "stroke fill",
        }
      : {}),
  } as CSSProperties;
  const hasLineBackground =
    textSettings.style === "solid" || textSettings.style === "light";
  const textBandFill =
    textSettings.style === "solid"
      ? "rgba(0, 0, 0, 0.9)"
      : "rgba(255, 255, 255, 0.95)";
  const textBandTextClass = cn(
    textSettings.style === "solid" && "text-white",
    textSettings.style === "light" && "text-zinc-950",
  );

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[10px] bg-zinc-900 text-white",
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
            "absolute inset-0 z-10 flex flex-col",
            textSettings.padding === "padded" ? "px-[7%] py-[8%]" : "px-[2.5%] py-[3%]",
            positionClasses[textSettings.position],
            textSettings.padding === "flush" && textSettings.position === "top" && "pt-[3%]",
            textSettings.padding === "flush" && textSettings.position === "bottom" && "pb-[3%]",
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
              "flex flex-col gap-[clamp(4px,1.8%,10px)]",
              alignClasses[textSettings.align],
              textSettings.style === "translucent" &&
                "rounded-lg bg-black/55 px-4 py-3 text-white backdrop-blur-sm",
            )}
            style={textStyle}
          >
            {slide.eyebrow ? (
              hasLineBackground ? (
                <BackgroundTextBlock
                  text={slide.eyebrow}
                  maxLines={1}
                  radius={textSettings.backgroundRadius}
                  backgroundFill={textBandFill}
                  textClassName={textBandTextClass}
                  className="text-[clamp(7px,1vw,11px)] font-semibold uppercase tracking-[0.16em] opacity-90"
                  style={textEffectStyle}
                />
              ) : (
                <p
                  className="w-fit max-w-full text-[clamp(7px,1vw,11px)] font-semibold uppercase tracking-[0.16em] opacity-90"
                  style={textEffectStyle}
                >
                  {slide.eyebrow}
                </p>
              )
            ) : null}
            {hasLineBackground ? (
              <BackgroundTextBlock
                text={slide.headline}
                maxLines={5}
                radius={textSettings.backgroundRadius}
                backgroundFill={textBandFill}
                textClassName={textBandTextClass}
                className="font-bold"
                style={{
                  ...textEffectStyle,
                  fontSize:
                    "clamp(13px, calc(var(--slide-copy-size) * .72), var(--slide-copy-size))",
                }}
              />
            ) : (
              <p
                className="w-fit max-w-full overflow-hidden pb-[0.14em] font-bold leading-[1.08]"
                style={{
                  ...textEffectStyle,
                  fontSize:
                    "clamp(13px, calc(var(--slide-copy-size) * .72), var(--slide-copy-size))",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 5,
                }}
              >
                {slide.headline}
              </p>
            )}
            {slide.body ? (
              hasLineBackground ? (
                <BackgroundTextBlock
                  text={slide.body}
                  maxLines={4}
                  radius={textSettings.backgroundRadius}
                  backgroundFill={textBandFill}
                  textClassName={textBandTextClass}
                  className="text-[clamp(8px,1.15vw,13px)] font-medium opacity-95"
                  style={textEffectStyle}
                />
              ) : (
                <p
                  className="w-fit max-w-full overflow-hidden pb-[0.14em] text-[clamp(8px,1.15vw,13px)] font-medium leading-[1.55] opacity-95"
                  style={{
                    ...textEffectStyle,
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 4,
                  }}
                >
                  {slide.body}
                </p>
              )
            ) : null}
          </div>
        </div>
      ) : null}
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
