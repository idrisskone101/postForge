"use client";

import { Smartphone } from "lucide-react";
import { isPhoneSceneId, listPhoneScenes } from "@/lib/phone-composite/scenes";
import { Switch } from "@/components/ui/switch";
import { usePhoneComposite } from "./use-phone-composite";
import type { PhoneCompositeSectionProps } from "./types";

export function PhoneCompositeSection({
  onUseScenePrompt,
}: PhoneCompositeSectionProps) {
  const { view, actions } = usePhoneComposite();
  const scenes = listPhoneScenes();

  return (
    <section className="pf-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="pf-section-title">Phone screenshot</h2>
            <span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Warp
            </span>
          </div>
          <p className="mt-2 max-w-lg text-[12px] leading-4 text-muted-foreground">
            Generate a lifestyle base with a blank matte-black phone screen, then warp a
            real screenshot onto that screen. The model never redraws the app UI.
          </p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
          <Smartphone className="size-4" />
        </span>
      </div>

      <div className="grid gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-muted-foreground">
            Scene
          </span>
          <select
            value={view.scene}
            onChange={(event) => {
              const next = event.target.value;
              if (isPhoneSceneId(next)) actions.onSceneChange(next);
            }}
            className="h-9 w-full appearance-none rounded-lg border border-border bg-card px-2.5 text-[12px] font-medium text-foreground outline-none focus:border-[var(--pf-orange)]"
          >
            {scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.name} · {scene.detail}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onUseScenePrompt(actions.onFillPrompt())}
          className="pf-button-secondary h-9 justify-center text-[12px]"
        >
          {view.fillPromptTitle}
        </button>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-muted-foreground">
            Lifestyle base
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              actions.onBaseFileChange(event.target.files?.[0] ?? null)
            }
            className="block w-full text-[12px] text-muted-foreground file:mr-3 file:h-8 file:rounded-lg file:border file:border-border file:bg-[var(--pf-surface)] file:px-3 file:text-[12px] file:font-semibold file:text-foreground"
          />
          <span className="mt-1 block truncate text-[12px] text-muted-foreground">
            {view.baseLabel}
          </span>
        </label>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[var(--pf-active)] px-3 py-2.5">
          <span>
            <strong className="block text-[12px] font-semibold text-foreground">
              Use scene placement preview
            </strong>
            <small className="mt-0.5 block text-[12px] text-muted-foreground">
              A blank-screen stand-in matching this scene&apos;s corner preset
            </small>
          </span>
          <Switch
            aria-label="Use scene placement preview"
            checked={view.usePlaceholder}
            onCheckedChange={actions.onUsePlaceholderChange}
          />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-muted-foreground">
            Real screenshot
          </span>
          <input
            type="file"
            accept="image/png,image/*"
            onChange={(event) =>
              actions.onScreenshotFileChange(event.target.files?.[0] ?? null)
            }
            className="block w-full text-[12px] text-muted-foreground file:mr-3 file:h-8 file:rounded-lg file:border file:border-border file:bg-[var(--pf-surface)] file:px-3 file:text-[12px] file:font-semibold file:text-foreground"
          />
          <span className="mt-1 block truncate text-[12px] text-muted-foreground">
            {view.screenshotLabel}
          </span>
        </label>

        {view.error ? (
          <p className="text-[12px] font-medium text-[var(--pf-danger)]">{view.error}</p>
        ) : null}

        <button
          type="button"
          disabled={!view.canSubmit}
          onClick={actions.onSubmit}
          className="pf-button-primary h-10 justify-center text-[12px] disabled:opacity-50"
        >
          {view.busy ? "Compositing…" : "Composite screenshot onto phone"}
        </button>
      </div>
    </section>
  );
}
