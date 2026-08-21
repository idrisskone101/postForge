"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Layers,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

import { NativeSelect, sliderNumber } from "./editor-controls";
import { MAX_SLIDESHOW_SLIDES } from "./model";
import { phaseLabel } from "./slideshow-view";
import { FIELD_LABEL, INPUT } from "./studio-ui";
import type {
  SlideshowTextAlign,
  SlideshowTextPosition,
  SlideshowTextSettings,
  SlideshowTextStyle,
} from "./types";
import { useSlideshowEditor } from "./slideshow-editor-provider";

export function EditorInspector() {
  const {
    draft,
    activeSlide,
    activePhase,
    activeIndex,
    layerCount,
    regenerating,
    regeneratingImage,
    saveState,
    updateTextSettings,
    updateActiveSlide,
    onRegenerateText,
    onRegenerateImage,
  } = useSlideshowEditor();
  return (
        <aside className="border-t border-border bg-white xl:border-l xl:border-t-0">
          <div className="max-h-[700px] space-y-5 overflow-y-auto p-4 xl:max-h-[calc(100vh-170px)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-foreground">Text layers</p>
                <p className="mt-0.5 text-[12px] capitalize text-muted-foreground">
                  {phaseLabel(activePhase)} · slide {activeIndex + 1}
                </p>
              </div>
              <span className="rounded-full bg-[var(--pf-active)] px-2 py-[3px] text-[12px] font-bold tabular-nums text-muted-foreground">
                {layerCount} {layerCount === 1 ? "layer" : "layers"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NativeSelect<SlideshowTextSettings["font"]>
                label="Font"
                value={draft.textSettings.font}
                options={[
                  "Poppins",
                  "Serif",
                  "SerifItalic",
                  "Editorial",
                  "Condensed",
                  "Inter",
                  "Mono",
                  "Rounded",
                ]}
                optionLabel={(font) =>
                  ({
                    Poppins: "Default",
                    Serif: "Serif",
                    SerifItalic: "Serif italic",
                    Editorial: "Serif italic 2",
                    Condensed: "Condensed bold",
                    Inter: "Inter",
                    Mono: "Mono",
                    Rounded: "Rounded",
                  })[font]
                }
                onChange={(font) => updateTextSettings({ font })}
              />
              <NativeSelect<SlideshowTextSettings["color"]>
                label="Color"
                value={draft.textSettings.color}
                options={["white", "black", "coral", "blue", "yellow", "custom"]}
                onChange={(color) => updateTextSettings({ color })}
              />
              <NativeSelect<SlideshowTextStyle>
                label="Style"
                value={draft.textSettings.style}
                options={["plain", "outline", "solid", "light", "translucent"]}
                optionLabel={(style) =>
                  ({
                    plain: "Text shadow",
                    outline: "Outline",
                    solid: "Background",
                    light: "Light BG",
                    translucent: "Translucent",
                  })[style]
                }
                onChange={(style) => updateTextSettings({ style })}
              />
              <NativeSelect<SlideshowTextPosition>
                label="Position"
                value={draft.textSettings.position}
                options={["top", "center", "bottom"]}
                onChange={(position) => updateTextSettings({ position })}
              />
              <NativeSelect<SlideshowTextSettings["padding"]>
                label="Top / bottom padding"
                value={draft.textSettings.padding}
                options={["padded", "flush"]}
                onChange={(padding) => updateTextSettings({ padding })}
              />
            </div>

            <div>
              <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                <span>Text size</span>
                <span className="font-mono tabular-nums text-muted-foreground">{draft.textSettings.size}px</span>
              </span>
              <Slider
                min={14}
                max={64}
                step={1}
                value={[draft.textSettings.size]}
                onValueChange={(value) =>
                  updateTextSettings({ size: sliderNumber(value, 28) })
                }
                aria-label="Text size"
              />
            </div>

            <div>
              <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                <span>Text width</span>
                <span className="font-mono tabular-nums text-muted-foreground">{draft.textSettings.width}%</span>
              </span>
              <Slider
                min={50}
                max={100}
                step={1}
                value={[draft.textSettings.width]}
                onValueChange={(value) =>
                  updateTextSettings({ width: sliderNumber(value, 88) })
                }
                aria-label="Text width"
              />
            </div>

            {draft.textSettings.style === "solid" ||
            draft.textSettings.style === "light" ? (
              <div>
                <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                  <span>Background radius</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {draft.textSettings.backgroundRadius}px
                  </span>
                </span>
                <Slider
                  min={0}
                  max={20}
                  step={1}
                  value={[draft.textSettings.backgroundRadius]}
                  onValueChange={(value) =>
                    updateTextSettings({
                      backgroundRadius: sliderNumber(value, 4),
                    })
                  }
                  aria-label="Background radius"
                />
              </div>
            ) : null}

            {draft.textSettings.color === "custom" ? (
              <label className="flex items-center justify-between gap-4 rounded-[6px] border border-border bg-card p-3">
                <span>
                  <span className="block text-[12px] font-semibold text-foreground">Custom text color</span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    Choose any brand color.
                  </span>
                </span>
                <input
                  type="color"
                  value={draft.textSettings.customColor ?? "#ffffff"}
                  onChange={(event) =>
                    updateTextSettings({ customColor: event.target.value })
                  }
                  aria-label="Custom text color"
                  className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                />
              </label>
            ) : null}

            <div>
              <span className={FIELD_LABEL}>Alignment</span>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-[var(--pf-active)] p-1">
                {(
                  [
                    ["left", AlignLeft],
                    ["center", AlignCenter],
                    ["right", AlignRight],
                  ] as const
                ).map(([align, Icon]) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() =>
                      updateTextSettings({ align: align as SlideshowTextAlign })
                    }
                    aria-label={`Align text ${align}`}
                    aria-pressed={draft.textSettings.align === align}
                    className={cn(
                      "flex h-7 items-center justify-center rounded-lg transition",
                      draft.textSettings.align === align
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className={FIELD_LABEL}>Eyebrow</span>
              <input
                value={activeSlide.eyebrow}
                onChange={(event) =>
                  updateActiveSlide({ eyebrow: event.target.value })
                }
                className={cn(INPUT, "h-9")}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                <span>Headline</span>
                <span className="font-mono tabular-nums">{activeSlide.headline.length}/180</span>
              </span>
              <textarea
                value={activeSlide.headline}
                maxLength={180}
                rows={2}
                onChange={(event) =>
                  updateActiveSlide({ headline: event.target.value })
                }
                className={cn(INPUT, "resize-none py-2 font-medium leading-5")}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                <span>Supporting copy</span>
                <span className="font-mono tabular-nums">{activeSlide.body.length}/420</span>
              </span>
              <textarea
                value={activeSlide.body}
                maxLength={420}
                rows={3}
                onChange={(event) => updateActiveSlide({ body: event.target.value })}
                className={cn(INPUT, "resize-none py-2 leading-5")}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>AI direction</span>
              <textarea
                value={activeSlide.prompt}
                rows={2}
                onChange={(event) =>
                  updateActiveSlide({ prompt: event.target.value })
                }
                className={cn(INPUT, "resize-none py-2 leading-5")}
              />
            </label>

            <div className="rounded-[6px] border border-accent-blue/20 bg-accent-blue/[0.05] p-3.5">
              <div className="flex items-start gap-2.5">
                <WandSparkles className="mt-0.5 size-4 shrink-0 text-accent-blue" />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground">AI copy variation</p>
                  <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">
                    Rewrite this slide without changing the visual layout.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void onRegenerateText()}
                    disabled={regenerating}
                    className="mt-2.5 h-8 rounded-lg bg-accent-blue px-3 text-[13px] font-semibold text-white hover:brightness-105 active:scale-[0.97]"
                  >
                    {regenerating ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    {regenerating ? "Rewriting..." : "Regenerate text"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-[6px] border border-[var(--pf-orange)]/20 bg-[var(--pf-orange)]/[0.04] p-3.5">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--pf-orange)]" />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground">AI image variation</p>
                  <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">
                    Queue a new visual from the AI direction. One image job at $0.08.
                  </p>
                  <button
                    type="button"
                    onClick={() => void onRegenerateImage()}
                    disabled={regeneratingImage || saveState === "saving"}
                    className="pf-button-primary mt-2.5 h-8 min-h-8"
                  >
                    {regeneratingImage ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    {regeneratingImage ? "Rendering..." : "Regenerate image"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[6px] border border-border bg-[var(--pf-active)] p-3">
              <div>
                <p className="text-[12px] font-semibold text-foreground">Slide count</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Reel-ready range: 1-{MAX_SLIDESHOW_SLIDES}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[13px] font-semibold text-foreground shadow-sm ring-1 ring-border">
                <Layers className="size-3 text-[var(--pf-orange)]" />
                {draft.slides.length}/{MAX_SLIDESHOW_SLIDES}
              </span>
            </div>
          </div>
        </aside>
  );
}
