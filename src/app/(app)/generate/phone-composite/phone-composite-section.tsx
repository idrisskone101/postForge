"use client";

import { useId } from "react";
import { isPhoneSceneId, listPhoneScenes } from "@/lib/phone-composite/scenes";
import { Button, Panel, Toggle } from "@/components/workbench";
import { usePhoneComposite } from "./use-phone-composite";
import type { PhoneCompositeFileFieldProps, PhoneCompositeSectionProps } from "./types";

export function PhoneCompositeSection({
  onUseScenePrompt,
}: PhoneCompositeSectionProps) {
  const { view, actions } = usePhoneComposite();
  const scenes = listPhoneScenes();
  const sceneId = useId();

  return (
    <Panel title="Phone screenshot">
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={sceneId} className="wb-label">
          Scene
        </label>
        <select
          id={sceneId}
          aria-label="Phone screenshot scene"
          value={view.scene}
          onChange={(event) => {
            const next = event.target.value;
            if (isPhoneSceneId(next)) actions.onSceneChange(next);
          }}
          className="wb-input"
        >
          {scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.name}
            </option>
          ))}
        </select>
        <p className="wb-meta">{view.sceneDetail}</p>
      </div>

      <Button className="w-full" onClick={() => onUseScenePrompt(actions.onFillPrompt())}>
        {view.fillPromptTitle}
      </Button>

      <PhoneCompositeFileField
        label="Lifestyle base"
        accept="image/*"
        fileLabel={view.baseLabel}
        onFileChange={actions.onBaseFileChange}
      />

      <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-raised py-2 pl-3.5 pr-2">
        <span className="min-w-0 text-[14px] font-medium leading-[18px] text-fg">
          Use scene placement preview
        </span>
        <Toggle
          label="Use scene placement preview"
          checked={view.usePlaceholder}
          onCheckedChange={actions.onUsePlaceholderChange}
        />
      </div>

      <PhoneCompositeFileField
        label="Real screenshot"
        accept="image/png,image/*"
        fileLabel={view.screenshotLabel}
        onFileChange={actions.onScreenshotFileChange}
      />

      {view.error ? (
        <p role="alert" className="wb-notice" data-tone="bad">
          {view.error}
        </p>
      ) : null}

      <Button variant="strong" size={40} className="w-full" disabled={!view.canSubmit} onClick={actions.onSubmit}>
        {view.busy ? "Compositing…" : "Composite screenshot onto phone"}
      </Button>
    </Panel>
  );
}

function PhoneCompositeFileField({
  label,
  accept,
  fileLabel,
  onFileChange,
}: PhoneCompositeFileFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="wb-label">{label}</span>
      <span className="flex min-w-0 items-center gap-3">
        <label className="wb-btn wb-btn-32 relative shrink-0 cursor-pointer overflow-hidden has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ember">
          Choose file
          <input
            type="file"
            accept={accept}
            aria-label={label}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <span className="min-w-0 truncate text-[13px] leading-[18px] text-fg-secondary">
          {fileLabel}
        </span>
      </span>
    </div>
  );
}
