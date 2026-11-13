"use client";

import { Button } from "@/components/workbench";
import { cn } from "@/lib/utils";

import { EditorAdvancedSettings, EditorSlideSettings } from "./editor-slide-settings";
import { EditorTypeControls } from "./editor-type-controls";
import { useSlideshowEditor } from "./slideshow-editor-provider";

export function EditorInspector() {
  const {
    activeSlide,
    regenerating,
    regeneratingImage,
    saveState,
    updateActiveSlide,
    onRegenerateText,
    onRegenerateImage,
  } = useSlideshowEditor();
  return (
    <aside
      aria-label="Slide inspector"
      className="wb-panel gap-0 p-0 xl:w-[320px] xl:shrink-0"
    >
      <div className="min-h-0 xl:flex-1 xl:overflow-y-auto" data-inspector-scroll>
        <div className="flex flex-col gap-3.5 px-5 pb-6 pt-[18px]">
          <label className="wb-field group">
            <span className="wb-label transition-colors duration-160 ease-pf group-focus-within:text-ember-text">
              Eyebrow
            </span>
            <input
              value={activeSlide.eyebrow}
              onChange={(event) => updateActiveSlide({ eyebrow: event.target.value })}
              className="wb-input"
            />
          </label>
          <CopyField
            label="Headline"
            strong
            value={activeSlide.headline}
            max={HEADLINE_MAX}
            onChange={(headline) => updateActiveSlide({ headline })}
          />
          <CopyField
            label="Supporting copy"
            value={activeSlide.body}
            max={BODY_MAX}
            onChange={(body) => updateActiveSlide({ body })}
          />
          <EditorTypeControls />
          <EditorSlideSettings />
          <EditorAdvancedSettings />
          <label className="flex flex-col gap-2.5 border-t border-hairline pt-4">
            <span className="wb-panel-title">AI direction</span>
            <textarea
              value={activeSlide.prompt}
              rows={3}
              onChange={(event) => updateActiveSlide({ prompt: event.target.value })}
              className="wb-input h-auto max-h-[140px] min-h-[80px] resize-none overflow-y-auto py-2.5 leading-5 [field-sizing:content]"
            />
          </label>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none sticky bottom-0 -mt-6 h-6 bg-gradient-to-t from-panel to-transparent max-xl:hidden"
        />
      </div>
      <div className="flex shrink-0 gap-2 px-5 pb-5 pt-3">
        <Button
          size={38}
          className="min-w-0 flex-1 px-2"
          aria-busy={regenerating || undefined}
          disabled={regenerating}
          onClick={() => void onRegenerateText()}
        >
          {regenerating ? "Rewriting" : "Regenerate text"}
        </Button>
        <Button
          variant="strong"
          size={38}
          className="min-w-0 flex-1 px-2"
          aria-busy={regeneratingImage || undefined}
          disabled={regeneratingImage || saveState === "saving"}
          onClick={() => void onRegenerateImage()}
        >
          {regeneratingImage ? "Rendering" : "Regenerate image"}
        </Button>
      </div>
    </aside>
  );
}

function CopyField({
  label,
  strong = false,
  value,
  max,
  onChange,
}: {
  label: string;
  strong?: boolean;
  value: string;
  max: number;
  onChange: (value: string) => void;
}) {
  const nearLimit = value.length >= max * 0.8;
  return (
    <label className="wb-field group">
      <span className="flex items-center justify-between">
        <span className="wb-label transition-colors duration-160 ease-pf group-focus-within:text-ember-text">
          {label}
        </span>
        {nearLimit ? (
          <span className="wb-mono text-fg-secondary">
            {value.length} / {max}
          </span>
        ) : null}
      </span>
      <textarea
        value={value}
        maxLength={max}
        rows={1}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "wb-input field-sizing-content min-h-[42px] resize-none py-2.5 leading-5",
          strong && "font-medium",
        )}
      />
    </label>
  );
}

const HEADLINE_MAX = 180;
const BODY_MAX = 420;
