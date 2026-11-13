"use client";

import { Button, Icon } from "@/components/workbench";

import type { CreatorDraft } from "./view-models";

export function CreatorFooter({ draft }: { draft: CreatorDraft }) {
  const {
    hook,
    aspectRatio,
    onAspectRatioChange,
    imageModels,
    selectedImageModel,
    onSelectImageModel,
    needsGeneration,
    generating,
    error,
    onSubmit,
  } = draft;
  const models = imageModels && imageModels.length ? imageModels : FALLBACK_MODELS;
  return (
    <>
      {error ? (
        <p role="alert" className="wb-notice" data-tone="bad">
          <strong>{error}</strong>
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
        <div className="flex min-w-0 flex-wrap gap-2">
          <select
            aria-label="Aspect ratio"
            value={aspectRatio}
            onChange={(event) => onAspectRatioChange(parseAspectRatio(event.target.value))}
            data-size="36"
            className="wb-input w-24 font-medium"
          >
            {ASPECT_RATIOS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          {needsGeneration ? (
            <select
              aria-label="Image model"
              value={selectedImageModel ?? "gpt-image-2"}
              onChange={(event) => onSelectImageModel?.(event.target.value)}
              data-size="36"
              className="wb-input w-[168px] font-medium"
            >
              {models.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <Button
          variant="primary"
          size={40}
          onClick={() => void onSubmit()}
          disabled={generating || !hook.trim()}
          aria-busy={generating || undefined}
          className="h-11 pr-5 pl-4 font-bold max-sm:w-full"
        >
          <Icon name={needsGeneration ? "generate" : "slideshow"} strokeWidth={1.5} />
          {submitLabel(generating, needsGeneration)}
        </Button>
      </div>
    </>
  );
}

const ASPECT_RATIOS = ["9:16", "4:5", "1:1", "16:9"] as const;
const FALLBACK_MODELS = [{ id: "gpt-image-2", name: "GPT Image 2" }];

function submitLabel(generating: boolean, needsGeneration: boolean) {
  if (generating) return "Creating slideshow";
  return needsGeneration ? "Generate slideshow" : "Create slideshow";
}

function parseAspectRatio(value: string): CreatorDraft["aspectRatio"] {
  return ASPECT_RATIOS.find((option) => option === value) ?? "9:16";
}
