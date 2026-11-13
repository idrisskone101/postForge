import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const generationStudio = source("src/components/generation-form.tsx");
const generationEditor = source("src/app/(app)/generate/[id]/page.tsx");
const generationInspector = source("src/app/(app)/generate/job-inspector.tsx");
const formConstants = source("src/app/(app)/generate/form-constants.ts");
const previewPanel = source("src/app/(app)/generate/form-submit-bars.tsx");
const generatePage = source("src/app/(app)/generate/page.tsx");

// The form and its skeleton share one layout, so the columns cannot shift when the form mounts.
assert.match(generationStudio, /GENERATE_LAYOUT\.root/);
assert.match(source("src/app/(app)/generate/generate-form-skeleton.tsx"), /GENERATE_LAYOUT\.root/);
assert.match(formConstants, /xl:w-\[380px\]/);
assert.match(formConstants, /min-w-0 flex-1/);

// The shell owns page padding and the header band.
assert.doesNotMatch(generatePage, /px-\d|max-w-\[/);

// Loading and failure states must not widen their containing panels.
assert.match(generationEditor, /max-w-md/);
assert.match(previewPanel, /submitError[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(generationInspector, /job\.prompt[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(generationInspector, /negativePrompt[\s\S]*?\[overflow-wrap:anywhere\]/);

assert.match(generatePage, /GenerationFormLazy/);
assert.match(generatePage, /Suspense/);
assert.match(generatePage, /GenerateFormSkeleton/);
// The page awaits the stored availability. The synchronous read falls back to
// every registry model while its cache is cold.
assert.match(generatePage, /await Promise\.all\(\[searchParams, getAvailableModels\(\)\]\)/);
assert.doesNotMatch(generatePage, /getAvailableModelsNow/);
assert.match(source("src/components/generation-form-lazy.tsx"), /useWindowLoadReady/);

// Copy is real text: no attribute-painted labels or sr-only twins.
for (const file of [
  "src/app/(app)/generate/form-prompt-section.tsx",
  "src/app/(app)/generate/generate-header-accessory.tsx",
  "src/components/generation-form.tsx",
  "src/components/model-picker.tsx",
]) {
  assert.doesNotMatch(source(file), /data-generate-|sr-only/, `${file} must render real text`);
}
assert.doesNotMatch(source("src/app/styles/transitional.css"), /data-generate-/);
