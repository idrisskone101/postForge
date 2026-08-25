import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { PromptTemplatesControl } from "../../src/app/(app)/generate/prompt-templates-control";

const originalFetch = globalThis.fetch;

globalThis.fetch = async () =>
  Response.json({
    records: [
      {
        id: "tpl-1",
        kind: "prompt-template",
        name: "Kitchen UGC",
        prompt: "Handheld kitchen demo with window light",
        createdAt: "2026-08-22T12:00:00.000Z",
        updatedAt: "2026-08-22T12:00:00.000Z",
      },
    ],
  });

const markup = renderToStaticMarkup(
  <PromptTemplatesControl
    prompt="Handheld kitchen demo with window light"
    onPromptChange={() => {}}
  />
);

assert.match(markup, /Templates/);
assert.match(markup, /aria-label="Prompt templates"/);
assert.doesNotMatch(markup, /Save prompt/, "dialog content stays closed in static render");

globalThis.fetch = originalFetch;

const formControlsSource = readFileSync(
  new URL("../../src/app/(app)/generate/form-controls.tsx", import.meta.url),
  "utf8"
);
assert.match(formControlsSource, /PromptTemplatesControl/);
assert.match(formControlsSource, /onPromptChange={onPromptChange}/);
assert.match(formControlsSource, /aria-label="Creative prompt"/);

const controlSource = readFileSync(
  new URL("../../src/app/(app)/generate/prompt-templates-control.tsx", import.meta.url),
  "utf8"
);
const hookSource = readFileSync(
  new URL("../../src/app/(app)/generate/use-prompt-templates.ts", import.meta.url),
  "utf8"
);
assert.match(controlSource, /Prompt templates/);
assert.match(controlSource, /aria-label="Template name"/);
assert.match(controlSource, /Save prompt/);
assert.match(controlSource, /role="alert"/);
assert.match(controlSource, /No templates yet\. Name this prompt and save it\./);
assert.match(controlSource, /pf-button-primary/);
assert.match(controlSource, /pf-button-secondary/);
assert.match(controlSource, /Delete/);
assert.match(controlSource, /aria-label="Prompt templates"/);
assert.match(controlSource, /onPromptChange/);
assert.match(controlSource, /Dialog/);
assert.doesNotMatch(controlSource, /Popover/);
assert.match(hookSource, /parsePromptTemplateRecords/);
assert.match(hookSource, /PROMPT_TEMPLATE_FEATURE/);
assert.match(hookSource, /fetchWorkspaceFeature/);
assert.match(hookSource, /saveWorkspaceFeature/);
assert.match(hookSource, /removeWorkspaceFeature/);
assert.doesNotMatch(hookSource, /prompt-templates-client/);

console.log("prompt templates control tests passed");
