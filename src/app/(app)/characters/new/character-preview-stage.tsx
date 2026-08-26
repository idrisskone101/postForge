"use client";

import { Check, Dices, Loader2, RefreshCw } from "lucide-react";
import { CharacterPhoto } from "@/components/character-photo";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { cn } from "@/lib/utils";
import { CharactersPaintText } from "../characters-paint-text";
import {
  previewStatusClass,
  previewStatusIcon,
  previewStatusLabel,
  type PreviewStatusIcon,
} from "./character-preview-status";
import type { CharacterPreviewStageViewModel } from "./types";

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
  const paintReady = useWindowLoadReady();
  const statusLabel = previewStatusLabel(
    rendering,
    previewSaveBlocked,
    previewRequiresRender
  );
  const statusClass = previewStatusClass(
    rendering,
    previewSaveBlocked,
    previewRequiresRender
  );
  const statusIcon = previewStatusIcon(rendering, previewSaveBlocked);
  const costText = previewRequiresRender
    ? "Uses one paid image generation per click. Re-render before saving changes so the photo matches the recipe."
    : "Save as a draft without generating. Render a preview when you want to make this identity reusable.";
  const randomizeLabel = rendering ? "Rendering…" : "Randomize & render";

  return (
    <section
      data-character-preview-stage="true"
      aria-label="Live character portrait"
      aria-busy={rendering}
      className="relative flex min-h-[620px] min-w-0 flex-col overflow-hidden border-b border-[var(--pf-border)] bg-[#09090B] px-5 pb-5 pt-5 min-[1280px]:row-start-2 min-[1280px]:h-full min-[1280px]:min-h-0 min-[1280px]:border-b-0 min-[1280px]:border-r min-[1280px]:px-6 min-[1280px]:pb-5 min-[1280px]:pt-5"
    >
      <div className="relative z-10 flex flex-nowrap items-start justify-between gap-3 overflow-hidden">
        <div>
          <CharactersPaintText
            ready={paintReady}
            liveAs="span"
            liveClassName="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70"
            paint={
              <p data-character-preview-label="Photographic recipe preview">
                <span className="sr-only">Photographic recipe preview</span>
              </p>
            }
          >
            Photographic recipe preview
          </CharactersPaintText>
          <CharactersPaintText
            ready={paintReady}
            liveAs="span"
            liveClassName="mt-1 max-w-sm text-[12px] leading-4 text-white/55 [overflow-wrap:anywhere]"
            paint={
              <p id="character-preview-generation-cost" data-character-cost={costText}>
                <span className="sr-only">{costText}</span>
              </p>
            }
          >
            {costText}
          </CharactersPaintText>
        </div>
        <span
          role="status"
          aria-live="polite"
          data-character-status={paintReady ? undefined : statusLabel}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold shadow-sm",
            statusClass
          )}
        >
          <PreviewStatusGlyph icon={statusIcon} />
          {paintReady ? <span>{statusLabel}</span> : <span className="sr-only">{statusLabel}</span>}
        </span>
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 content-start justify-items-center py-4 min-[1280px]:py-3">
        <div
          data-character-lcp-frame="true"
          className="overflow-hidden rounded-lg border border-white/10 shadow-[var(--pf-shadow-lg)]"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 390,
            height: 520,
          }}
        >
          <CharacterPhoto
            generatedFileId={previewFileId}
            avatarId={!previewFileId && previewIsPhotographic ? avatarId : null}
            alt={`${name || "Untitled character"} photographic preview`}
            className={cn(
              "transition duration-300 motion-reduce:transition-none",
              rendering && "scale-[1.01] blur-[2px] grayscale-[.2]"
            )}
            onLoadError={onLoadError}
            priority
          />
        </div>
      </div>

      <div className="relative z-10 grid gap-2 rounded-[8px] border border-white/10 p-2.5 sm:grid-cols-2 min-[1280px]:grid-cols-1 min-[1420px]:grid-cols-2">
        <button
          type="button"
          onClick={rerender}
          disabled={saving || rendering}
          aria-describedby="character-preview-generation-cost"
          className="pf-button-secondary disabled:cursor-not-allowed disabled:opacity-45"
          data-lcp={paintReady ? undefined : "Re-render preview"}
        >
          <RefreshCw className={cn("size-3.5", rendering && "animate-spin")} />
          {paintReady ? <span>Re-render preview</span> : <span className="sr-only">Re-render preview</span>}
        </button>
        <button
          type="button"
          onClick={randomizeAndRender}
          disabled={saving || rendering}
          aria-describedby="character-preview-generation-cost"
          title="Uses one paid image generation"
          className="pf-button-secondary disabled:cursor-not-allowed disabled:opacity-45"
          data-lcp={paintReady ? undefined : randomizeLabel}
        >
          {rendering ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Dices className="size-3.5" />
          )}
          {paintReady ? <span>{randomizeLabel}</span> : <span className="sr-only">{randomizeLabel}</span>}
        </button>
        <div className="flex min-w-0 items-center gap-2 px-1 py-1 sm:col-span-2 min-[1280px]:col-span-1 min-[1420px]:col-span-2">
          <span className="size-1.5 shrink-0 rounded-full bg-[var(--pf-success)]" />
          <CharactersPaintText
            ready={paintReady}
            liveAs="span"
            liveClassName="min-w-0 break-words text-[12px] font-medium text-white/60 [overflow-wrap:anywhere]"
            paint={
              <p
                data-lcp={`${attributes.gender} · ${attributes.age} · ${attributes.ethnicity}`}
                className="min-w-0 break-words text-[12px] font-medium text-white/60"
              >
                <span className="sr-only">
                  {attributes.gender} · {attributes.age} · {attributes.ethnicity}
                </span>
              </p>
            }
          >
            {attributes.gender} · {attributes.age} · {attributes.ethnicity}
          </CharactersPaintText>
        </div>
      </div>
    </section>
  );
}

function PreviewStatusGlyph({ icon }: { icon: PreviewStatusIcon }) {
  switch (icon) {
    case "loading":
      return <Loader2 aria-hidden="true" className="size-3 animate-spin" />;
    case "refresh":
      return <RefreshCw aria-hidden="true" className="size-3" />;
    case "check":
      return <Check aria-hidden="true" className="size-3" />;
    default: {
      const _exhaustive: never = icon;
      return _exhaustive;
    }
  }
}
