import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { GenerateFormView } from "../../src/components/generation-form";
import { VideoReferencePicker } from "../../src/components/video-reference-picker";
import { getAllModels } from "../../src/lib/ai/models";
import type {
  GenerateFormActions,
  GenerateFormModel,
} from "../../src/app/(app)/generate/form-types";

const models = getAllModels();
const selectedModel = models.find((model) => model.type === "image") ?? models[0];

const idleActions: GenerateFormActions = {
  onModelSelect: () => {},
  onPromptChange: () => {},
  onAspectRatioChange: () => {},
  onNumImagesChange: () => {},
  onDurationChange: () => {},
  onNegativePromptChange: () => {},
  onEnableWebSearchChange: () => {},
  onEnableAudioChange: () => {},
  onAdvancedOpenChange: () => {},
  onSubmit: () => {},
  onAppendToPrompt: () => {},
};

function formFields(
  overrides: Partial<GenerateFormModel> &
    Pick<GenerateFormModel, "selectedModel" | "prompt">
): GenerateFormModel {
  return {
    models,
    aspectRatio: "9:16",
    numImages: 1,
    negativePrompt: "",
    enableWebSearch: false,
    enableAudio: false,
    isSubmitting: false,
    advancedOpen: false,
    ...overrides,
  };
}

const markup = renderToStaticMarkup(
  <GenerateFormView
    form={formFields({
      selectedModel: selectedModel.id,
      prompt: "Portrait product demo on a kitchen counter",
      numImages: 2,
    })}
    actions={idleActions}
  />
);

assert.match(markup, /Creative prompt/);
assert.match(markup, /Choose a model/);
assert.match(markup, /Text to image/);
assert.match(markup, /Aspect ratio/);
assert.match(markup, /Estimated cost/);
assert.match(markup, /Generate now/);
assert.match(markup, /9:16/);
assert.match(markup, /aria-label="2 outputs" data-icon="true"|aria-pressed="true" aria-label="2 outputs"/);
assert.doesNotMatch(markup, /aria-label="Duration"/);
assert.match(markup, /Phone screenshot/);
assert.match(
  markup,
  /aria-expanded="false"[^>]*>(?:(?!<\/button>).)*Phone screenshot/,
  "the phone screenshot panel starts as a collapsed disclosure row",
);
assert.match(markup, /Composite screenshot onto phone/, "collapsed content stays mounted with its state");
assert.match(markup, /GPT Image 2\.5/);
assert.match(markup, /Phone screenshot scene/);
assert.match(markup, /Bathroom counter/);
assert.match(markup, /Nightstand at night/);
assert.match(markup, /Choose file/);
assert.doesNotMatch(markup, /Bathroom counter · /);
assert.doesNotMatch(markup, /Launch Forge/);
assert.doesNotMatch(markup, /Forge Mode/);
assert.doesNotMatch(markup, /Forging/);
assert.doesNotMatch(markup, /Execute Generation/);

const videoModel = models.find((model) => model.type === "video") ?? models[0];

const continuitySection = (
  <div>
    <h2>Character continuity</h2>
    <VideoReferencePicker selectedFileId={null} onChange={() => {}} />
  </div>
);
const videoMarkup = renderToStaticMarkup(
  <GenerateFormView
    form={formFields({
      selectedModel: videoModel.id,
      prompt: "Month six progress check",
      duration: 5,
      continuitySection,
    })}
    actions={idleActions}
  />
);

assert.match(videoMarkup, /Character continuity/);
assert.match(videoMarkup, /aria-label="Duration"/);
assert.match(videoMarkup, />5s</);
assert.match(videoMarkup, /Loading recent outputs…/);

const formSource = [
  "../../src/components/generation-form.tsx",
  "../../src/app/(app)/generate/form-continuity-section.tsx",
  "../../src/app/(app)/generate/use-generation-form.ts",
  "../../src/app/(app)/generate/generation-requests.ts",
]
  .map((relativePath) =>
    readFileSync(new URL(relativePath, import.meta.url), "utf8")
  )
  .join("\n");
assert.match(formSource, /getContinuityVideoModel\(\)/);
assert.match(formSource, /referenceFileId/);
assert.match(formSource, /VideoReferencePicker/);
assert.match(formSource, /Character continuity/);
