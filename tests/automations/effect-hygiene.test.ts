import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function countUseEffect(source: string) {
  return [...source.matchAll(/\buseEffect\s*\(/g)].length;
}

const builderHook = readFileSync(
  new URL(
    "../../src/app/automations/new/use-automation-builder.ts",
    import.meta.url
  ),
  "utf8"
);
const resourcesHook = readFileSync(
  new URL(
    "../../src/app/automations/new/use-automation-builder-resources.ts",
    import.meta.url
  ),
  "utf8"
);

assert.equal(
  countUseEffect(builderHook),
  1,
  "builder hook keeps one workspace load effect keyed on editId"
);
assert.doesNotMatch(
  builderHook,
  /\[record\.content\.slideCount\]/,
  "preview slide clamp must derive instead of syncing in an effect"
);
assert.match(builderHook, /clampPreviewSlide\(/);
assert.match(builderHook, /nextPreviewSlide\(/);

assert.equal(
  countUseEffect(resourcesHook),
  1,
  "builder resources keep one abortable loader for collections, source file, and integrations"
);
assert.match(resourcesHook, /AbortController/);
assert.match(resourcesHook, /fetchIntegrations\(\{ signal: controller\.signal \}\)/);

console.log("automation effect hygiene pins passed");
