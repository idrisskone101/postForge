"use client";

import { CharacterPhoto } from "@/components/character-photo";
import { Button, Icon, StatusChip } from "@/components/workbench";
import { cn } from "@/lib/utils";
import { previewStatus } from "./character-preview-status";
import type { CharacterPreviewStageViewModel } from "./types";

export function CharacterPreviewStage({
  view,
}: {
  view: CharacterPreviewStageViewModel;
}) {
  const {
    name,
    avatarId,
    previewFileId,
    previewIsPhotographic,
    rendering,
    saving,
    previewRequiresRender,
    previewSaveBlocked,
    rerender,
    onLoadError,
  } = view;
  const status = previewStatus(rendering, previewSaveBlocked, previewRequiresRender);
  return (
    <section
      aria-label="Photographic recipe preview"
      aria-busy={rendering}
      data-character-preview-stage
      className="wb-panel min-w-0 gap-3.5 p-4 sm:p-5 lg:w-[344px] lg:shrink-0"
    >
      <div className="relative grid min-h-[380px] flex-1 place-items-center rounded-lg bg-floor">
        <span
          className={cn(
            "block h-[334px] w-[250px] overflow-hidden rounded-[10px] transition-opacity duration-200 ease-pf sm:h-[352px] sm:w-[264px]",
            rendering && "opacity-55"
          )}
        >
          <CharacterPhoto
            generatedFileId={previewFileId}
            avatarId={!previewFileId && previewIsPhotographic ? avatarId : null}
            alt={`${name || "Untitled character"} photographic preview`}
            onLoadError={onLoadError}
            sizes="264px"
            priority
          />
        </span>
        <StatusChip tone={status.tone} className="absolute left-3 top-3">
          {status.tone === "live" ? <span className="wb-live-dot" /> : null}
          <span role="status" aria-live="polite">{status.label}</span>
        </StatusChip>
      </div>
      {previewRequiresRender ? (
        <p id="character-preview-generation-cost" className="text-[13px] leading-[19px] text-fg-muted">
          Uses one paid image generation per click. Re-render before saving changes so the photo matches the recipe.
        </p>
      ) : null}
      <Button
        size={40}
        block
        className="flex-none"
        onClick={rerender}
        disabled={saving || rendering}
        aria-describedby={previewRequiresRender ? "character-preview-generation-cost" : undefined}
      >
        <Icon name="rerender" size={16} />
        Re-render preview
      </Button>
    </section>
  );
}
