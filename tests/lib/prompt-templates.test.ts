import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createPromptTemplate,
  isPromptTemplateRecord,
  PROMPT_TEMPLATE_MAX_LENGTH,
  promptTemplateToSave,
  type PromptTemplateRecord,
} from "../../src/lib/prompt-templates";

const now = new Date("2026-08-22T12:00:00.000Z");

const valid: PromptTemplateRecord = {
  id: "tpl-1",
  kind: "prompt-template",
  name: "Kitchen UGC",
  prompt: "Handheld kitchen demo",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

assert.equal(isPromptTemplateRecord(valid), true);
assert.equal(isPromptTemplateRecord({ ...valid, kind: "collection" }), false);
assert.equal(isPromptTemplateRecord({ ...valid, id: "" }), false);
assert.equal(isPromptTemplateRecord({ ...valid, name: "   " }), false);
assert.equal(isPromptTemplateRecord({ ...valid, prompt: "" }), false);
assert.equal(isPromptTemplateRecord({ ...valid, createdAt: 1 }), false);
assert.equal(isPromptTemplateRecord({ ...valid, updatedAt: null }), false);

const created = createPromptTemplate({
  name: "  Kitchen  ",
  prompt: "  hello world  ",
  now,
  id: "fixed-id",
});
assert.equal(created.id, "fixed-id");
assert.equal(created.kind, "prompt-template");
assert.equal(created.name, "Kitchen");
assert.equal(created.prompt, "hello world");

assert.throws(
  () => createPromptTemplate({ name: "   ", prompt: "hello", now }),
  /Template name is required/
);
assert.throws(
  () => createPromptTemplate({ name: "Kitchen", prompt: "  ", now }),
  /Prompt text is required/
);

const longPrompt = "a".repeat(PROMPT_TEMPLATE_MAX_LENGTH + 250);
const clipped = createPromptTemplate({ name: "Long", prompt: longPrompt, now });
assert.equal(clipped.prompt.length, PROMPT_TEMPLATE_MAX_LENGTH);

const upserted = promptTemplateToSave(
  [created],
  { name: "kitchen", prompt: "Updated prompt" },
  new Date("2026-08-22T13:00:00.000Z")
);
assert.equal(upserted.id, created.id);
assert.equal(upserted.createdAt, created.createdAt);
assert.equal(upserted.prompt, "Updated prompt");
assert.equal(upserted.updatedAt, "2026-08-22T13:00:00.000Z");

const brandNew = promptTemplateToSave(
  [created],
  { name: "Bathroom", prompt: "Steam and tile" },
  new Date("2026-08-22T14:00:00.000Z")
);
assert.notEqual(brandNew.id, created.id);
assert.equal(brandNew.name, "Bathroom");

const workspaceFeatureRouteSource = readFileSync(
  new URL(
    "../../src/app/api/workspace-features/[feature]/route.ts",
    import.meta.url
  ),
  "utf8"
);
assert.match(workspaceFeatureRouteSource, /isPromptTemplateRecord/);
assert.match(workspaceFeatureRouteSource, /case "prompts":/);
