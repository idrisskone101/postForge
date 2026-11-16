"use client";

import { useState, type ReactNode } from "react";
import { AlignCenter, AlignLeft, AlignRight, Minus, Plus } from "lucide-react";

import { Chip, Segmented } from "@/components/workbench";
import { Slider } from "@/components/ui/slider";
import { slideshowTextColorHex } from "@/lib/slideshow/project-settings";

import {
  EditorDisclosure,
  EditorSelect,
  sliderNumber,
  type EditorOption,
} from "./editor-controls";
import { useSlideshowEditor } from "./slideshow-editor-provider";
import type {
  SlideshowTextAlign,
  SlideshowTextPosition,
  SlideshowTextSettings,
  SlideshowTextStyle,
} from "./types";

export function EditorTypeControls() {
  const { draft, updateTextSettings } = useSlideshowEditor();
  const [moreOpen, setMoreOpen] = useState(false);
  const text = draft.textSettings;
  const setSize = (size: number) =>
    updateTextSettings({ size: Math.min(MAX_SIZE, Math.max(MIN_SIZE, size)) });
  return (
    <div className="flex flex-col gap-3 border-t border-hairline pt-4">
      <div className="flex gap-2.5">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="slideshow-font">Font</label>
          <select
            id="slideshow-font"
            value={text.font}
            onChange={(event) =>
              updateTextSettings({ font: event.target.value as SlideshowTextSettings["font"] })
            }
            className="wb-input font-medium"
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div
          role="group"
          aria-label="Text size"
          className="flex h-[42px] w-[104px] shrink-0 items-center justify-between rounded-lg bg-raised px-1.5"
        >
          <StepButton label="Decrease text size" disabled={text.size <= MIN_SIZE} onClick={() => setSize(text.size - 1)}>
            <Minus className="size-3" strokeWidth={2} aria-hidden="true" />
          </StepButton>
          <output aria-live="polite" className="text-[14px] font-semibold tabular-nums text-fg">
            {text.size}
          </output>
          <StepButton label="Increase text size" disabled={text.size >= MAX_SIZE} onClick={() => setSize(text.size + 1)}>
            <Plus className="size-3" strokeWidth={2} aria-hidden="true" />
          </StepButton>
        </div>
      </div>
      <div className="flex gap-2.5">
        <Segmented<SlideshowTextAlign>
          label="Text alignment"
          value={text.align}
          options={ALIGN_OPTIONS}
          onChange={(align) => updateTextSettings({ align })}
          className="[&>.wb-segment]:w-[30px] [&_svg]:size-[15px]"
        />
        <Segmented<SlideshowTextPosition>
          label="Text position"
          value={text.position}
          options={POSITION_OPTIONS}
          onChange={(position) => updateTextSettings({ position })}
          className="wb-segmented-block min-w-0 flex-1 [&>.wb-segment]:px-0"
        />
      </div>
      <div role="group" aria-label="Text style" className="flex flex-wrap gap-1.5">
        {STYLE_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            check={false}
            chosen={text.style === option.value}
            onClick={() => updateTextSettings({ style: option.value })}
            className="h-[34px] px-3 aria-pressed:shadow-[0_0_0_1.5px_var(--pf-ember)]"
          >
            {option.label}
          </Chip>
        ))}
      </div>
      <EditorDisclosure
        title="Text options"
        open={moreOpen}
        onToggle={() => setMoreOpen((current) => !current)}
      >
        <div className="flex items-end gap-2.5">
          <div className="min-w-0 flex-1">
            <EditorSelect<SlideshowTextSettings["color"]>
              label="Color"
              value={text.color}
              options={COLOR_OPTIONS}
              onChange={(color) => updateTextSettings({ color })}
            />
          </div>
          {text.color === "custom" ? (
            <input
              type="color"
              value={slideshowTextColorHex(text)}
              onChange={(event) => updateTextSettings({ customColor: event.target.value })}
              aria-label="Custom text color"
              className="h-[42px] w-12 cursor-pointer rounded-lg bg-raised p-1.5"
            />
          ) : null}
        </div>
        <EditorSlider label="Text width" unit="%" min={50} max={100} value={text.width} fallback={88} onChange={(width) => updateTextSettings({ width })} />
        <div className="wb-field">
          <span className="wb-label">Top and bottom padding</span>
          <Segmented<SlideshowTextSettings["padding"]>
            label="Top and bottom padding"
            value={text.padding}
            options={PADDING_OPTIONS}
            onChange={(padding) => updateTextSettings({ padding })}
            className="wb-segmented-block"
          />
        </div>
        {text.style === "solid" || text.style === "light" ? (
          <EditorSlider label="Background radius" unit="px" min={0} max={20} value={text.backgroundRadius} fallback={4} onChange={(backgroundRadius) => updateTextSettings({ backgroundRadius })} />
        ) : null}
      </EditorDisclosure>
    </div>
  );
}

export function EditorSlider(props: {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  fallback: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="wb-field">
      <span className="flex items-center justify-between">
        <span className="wb-label">{props.label}</span>
        <span className="wb-mono text-fg-secondary">
          {props.value}
          {props.unit}
        </span>
      </span>
      <Slider
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={1}
        value={[props.value]}
        onValueChange={(value) => props.onChange(sliderNumber(value, props.fallback))}
      />
    </div>
  );
}

function StepButton(props: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      className="wb-icon-btn wb-icon-btn-strong wb-icon-btn-28"
    >
      {props.children}
    </button>
  );
}

const FONT_OPTIONS: EditorOption<SlideshowTextSettings["font"]>[] = [
  { value: "Poppins", label: "Default" },
  { value: "Serif", label: "Serif" },
  { value: "SerifItalic", label: "Serif italic" },
  { value: "Editorial", label: "Serif italic 2" },
  { value: "Condensed", label: "Condensed bold" },
  { value: "Inter", label: "Inter" },
  { value: "Mono", label: "Mono" },
  { value: "Rounded", label: "Rounded" },
];

const COLOR_OPTIONS: EditorOption<SlideshowTextSettings["color"]>[] = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
  { value: "coral", label: "Coral" },
  { value: "blue", label: "Blue" },
  { value: "yellow", label: "Yellow" },
  { value: "custom", label: "Custom" },
];

const STYLE_OPTIONS: EditorOption<SlideshowTextStyle>[] = [
  { value: "plain", label: "Text shadow" },
  { value: "outline", label: "Outline" },
  { value: "solid", label: "Background" },
  { value: "light", label: "Light background" },
  { value: "translucent", label: "Translucent" },
];

const ALIGN_OPTIONS = [
  { value: "left", label: <AlignLeft strokeWidth={1.5} />, ariaLabel: "Align text left" },
  { value: "center", label: <AlignCenter strokeWidth={1.5} />, ariaLabel: "Align text center" },
  { value: "right", label: <AlignRight strokeWidth={1.5} />, ariaLabel: "Align text right" },
] as const;

const POSITION_OPTIONS: EditorOption<SlideshowTextPosition>[] = [
  { value: "top", label: "Top" },
  { value: "center", label: "Middle" },
  { value: "bottom", label: "Bottom" },
];

const PADDING_OPTIONS: EditorOption<SlideshowTextSettings["padding"]>[] = [
  { value: "padded", label: "Padded" },
  { value: "flush", label: "Flush" },
];

const MIN_SIZE = 14;
const MAX_SIZE = 64;
