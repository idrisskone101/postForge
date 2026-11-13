import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const generationStudio = source("src/components/generation-form.tsx");
const generationEditor = source("src/app/(app)/generate/[id]/page.tsx");
const generationLoading = [
  "src/app/(app)/generate/form-controls.tsx",
  "src/app/(app)/generate/form-prompt-section.tsx",
]
  .map((file) => source(file))
  .join("\n");

// Primary workbenches collapse before their fixed minimum tracks can overflow.
assert.match(generationStudio, /xl:grid-cols-\[minmax\(360px,0\.72fr\)_minmax\(500px,1\.28fr\)\]/);

// Loading and failure states must not widen their containing cards.
assert.match(generationEditor, /max-w-md/);
assert.match(generationEditor, /max-w-full/);
assert.match(
  generationLoading,
  /mt-3 flex h-\[6\.75rem\] flex-wrap gap-1\.5 overflow-hidden/,
);
assert.match(generationStudio, /prompt\.trim\(\)\.slice\(0, 112\)[\s\S]*?\[overflow-wrap:anywhere\]|\[overflow-wrap:anywhere\][\s\S]*?prompt\.trim\(\)\.slice\(0, 112\)/);
assert.match(generationStudio, /bg-\[#09090B\]/);
assert.match(generationEditor, /bg-\[#09090B\]/);
assert.match(generationEditor, /job\.prompt[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(generationEditor, /negativePrompt[\s\S]*?\[overflow-wrap:anywhere\]/);
assert.match(source("src/app/(app)/generate/page.tsx"), /GenerationFormLazy/);
assert.match(source("src/app/(app)/generate/page.tsx"), /Suspense/);
assert.match(source("src/app/(app)/generate/generate-form-skeleton.tsx"), /data-generate-form="true"/);
assert.match(source("src/app/(app)/generate/page.tsx"), /GenerateFormSkeleton/);
assert.match(source("src/app/(app)/generate/page.tsx"), /getAvailableModelsNow/);
assert.doesNotMatch(source("src/app/(app)/generate/page.tsx"), /getAvailableModels\(/);
assert.match(
  source("src/app/(app)/generate/form-prompt-section.tsx"),
  /data-generate-notice="Prompt improvement needs a Gemini API key."/,
);
assert.match(
  source("src/app/(app)/generate/generate-header-accessory.tsx"),
  /data-generate-history=\{paintReady \? undefined : "History"\}/
);
assert.match(
  source("src/components/generation-form-lazy.tsx"),
  /useWindowLoadReady/,
);
