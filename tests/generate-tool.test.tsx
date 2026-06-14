import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { GenerateFormView } from "../src/components/generation-form";
import { getAllModels } from "../src/lib/ai/models";

const models = getAllModels();
const selectedModel = models.find((model) => model.type === "image") ?? models[0];

const markup = renderToStaticMarkup(
  <GenerateFormView
    models={models}
    selectedModel={selectedModel.id}
    prompt="Portrait product demo on a kitchen counter"
    aspectRatio="9:16"
    numImages={2}
    negativePrompt=""
    enableWebSearch={false}
    enableAudio={false}
    isSubmitting={false}
    advancedOpen={false}
    onModelSelect={() => {}}
    onPromptChange={() => {}}
    onAspectRatioChange={() => {}}
    onNumImagesChange={() => {}}
    onNegativePromptChange={() => {}}
    onEnableWebSearchChange={() => {}}
    onEnableAudioChange={() => {}}
    onAdvancedOpenChange={() => {}}
    onSubmit={() => {}}
    onAppendToPrompt={() => {}}
  />
);

assert.match(markup, /Creative Prompt/);
assert.match(markup, /Model Selection/);
assert.match(markup, /Aspect Ratio/);
assert.match(markup, /Cost Estimate/);
assert.match(markup, /Generate Now/);
assert.match(markup, /Current Config/);
assert.match(markup, /9:16/);
assert.match(markup, /2 img/);
assert.doesNotMatch(markup, /Launch Forge/);
assert.doesNotMatch(markup, /Forge Mode/);
assert.doesNotMatch(markup, /Forging/);
assert.doesNotMatch(markup, /Execute Generation/);
