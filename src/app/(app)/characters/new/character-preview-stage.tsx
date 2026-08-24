"use client";

import { Check, Dices, Loader2, RefreshCw } from "lucide-react";
import { CharacterPhoto } from "@/components/character-photo";
import type { CharacterAttributes } from "@/lib/character-attributes";
import { cn } from "@/lib/utils";

export type CharacterPreviewStageViewModel = {
  name: string;
  attributes: CharacterAttributes;
  avatarId: string | null;
  previewFileId: string | null;
  previewIsPhotographic: boolean;
  rendering: boolean;
  saving: boolean;
  previewRequiresRender: boolean;
  previewSaveBlocked: boolean;
  rerender: () => void;
  randomizeAndRender: () => void;
  onLoadError: () => void;
};

export function CharacterPreviewStage({
  view,
}: {
  view: CharacterPreviewStageViewModel;
}) {
  const {
    name,
    attributes,
    avatarId,
    previewFileId,
    previewIsPhotographic,
    rendering,
    saving,
    previewRequiresRender,
    previewSaveBlocked,
    rerender,
    randomizeAndRender,
    onLoadError,
  } = view;
  return (
    <section
      data-character-preview-stage="true"
      aria-label="Live character portrait"
      aria-busy={rendering}
      className="relative flex min-h-[620px] min-w-0 flex-col overflow-hidden border-b border-border bg-[#09090B] px-5 pb-5 pt-5 min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0 min-[1280px]:border-b-0 min-[1280px]:border-r min-[1280px]:px-6 min-[1280px]:pb-5 min-[1280px]:pt-5"
    >
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-white/70">Photographic recipe preview</p>
          <p id="character-preview-generation-cost" className="mt-1 max-w-[310px] text-[12px] leading-4 text-white/60">{previewRequiresRender ? "Uses one paid image generation per click. Re-render before saving changes so the photo matches the recipe." : "Save as a draft without generating. Render a preview when you want to make this identity reusable."}</p>
        </div>
        <span role="status" aria-live="polite" className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold shadow-sm",rendering ? "bg-[var(--pf-link)]/15 text-[var(--pf-link)]" : previewSaveBlocked ? "bg-[var(--pf-lamp-amber)]/15 text-[var(--pf-lamp-amber)]" : previewRequiresRender ? "bg-[var(--pf-success)]/15 text-[var(--pf-success)]" : "bg-white/10 text-white/80")}>{rendering ? <Loader2 aria-hidden="true" className="size-3 animate-spin" /> : previewSaveBlocked ? <RefreshCw aria-hidden="true" className="size-3" /> : <Check aria-hidden="true" className="size-3" />}{rendering ? "Rendering" : previewSaveBlocked ? "Changes pending" : previewRequiresRender ? "Preview ready" : "Draft — preview optional"}</span>
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 place-items-center py-4 min-[1280px]:py-3">
        <div
          data-character-lcp-frame="true"
          className="aspect-[3/4] h-auto max-h-full w-full max-w-[390px] overflow-hidden rounded-lg border border-white/10 shadow-[var(--pf-shadow-lg)] min-[1280px]:max-w-[440px]"
        >
          <CharacterPhoto
            generatedFileId={previewFileId}
            avatarId={!previewFileId && previewIsPhotographic ? avatarId : null}
            alt={`${name || "Untitled character"} photographic preview`}
            className={cn("transition duration-300 motion-reduce:transition-none", rendering && "scale-[1.01] blur-[2px] grayscale-[.2]")}
            onLoadError={onLoadError}
          />
        </div>
      </div>

      <div className="relative z-10 grid gap-2 rounded-lg border border-white/35 bg-white/20 p-2.5 backdrop-blur-sm sm:grid-cols-2 min-[1280px]:grid-cols-1 min-[1420px]:grid-cols-2">
        <button onClick={rerender} disabled={saving || rendering} aria-describedby="character-preview-generation-cost" className="pf-button-secondary !border-white/70 !bg-[var(--pf-surface)] disabled:cursor-not-allowed disabled:opacity-45"><RefreshCw className={cn("size-3.5",rendering && "animate-spin")} /> Re-render preview</button>
        <button onClick={randomizeAndRender} disabled={saving || rendering} aria-describedby="character-preview-generation-cost" title="Uses one paid image generation" className="pf-button-secondary !border-white/50 !bg-[var(--pf-surface)] disabled:cursor-not-allowed disabled:opacity-45">{rendering ? <Loader2 className="size-3.5 animate-spin" /> : <Dices className="size-3.5" />} {rendering ? "Rendering…" : "Randomize & render"}</button>
        <div className="flex min-w-0 items-center gap-2 px-1 py-1 sm:col-span-2 min-[1280px]:col-span-1 min-[1420px]:col-span-2">
          <span className="size-1.5 shrink-0 rounded-full bg-[var(--pf-success)]" />
          <p className="min-w-0 break-words text-[12px] font-medium text-white/60">{attributes.gender} · {attributes.age} · {attributes.ethnicity}</p>
        </div>
      </div>
    </section>
  );
}
