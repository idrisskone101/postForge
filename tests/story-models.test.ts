import assert from "node:assert/strict";
import {
  getStoryModelName,
  getStoryModelIdForOllamaId,
  resolveStoryModelOllamaId,
  STORY_MODELS,
  DEFAULT_MODEL,
} from "../src/lib/ai/story-models";

function run() {
  assert.ok(STORY_MODELS.length > 0, "expected at least one story model");
  assert.equal(STORY_MODELS[0].id, "deepseek-v4-flash");

  // Unknown / missing picker id resolves to the default Ollama model.
  assert.equal(resolveStoryModelOllamaId(undefined), DEFAULT_MODEL);
  assert.equal(resolveStoryModelOllamaId("does-not-exist"), DEFAULT_MODEL);

  // Known picker id resolves to its Ollama model id.
  const pro = STORY_MODELS.find((m) => m.id === "deepseek-v4-pro");
  assert.ok(pro);
  assert.equal(resolveStoryModelOllamaId("deepseek-v4-pro"), pro.ollamaId);
  assert.equal(resolveStoryModelOllamaId("deepseek-v4-pro"), "deepseek-v4-pro");

  // Round trip: ollamaId -> picker id -> ollamaId.
  assert.equal(
    resolveStoryModelOllamaId(getStoryModelIdForOllamaId(pro.ollamaId)),
    pro.ollamaId,
  );

  // Display name fallback.
  assert.equal(getStoryModelName(undefined), "DeepSeek V4 Flash");
  assert.equal(getStoryModelName("glm-5.2"), "GLM 5.2");

  console.log("story models tests passed");
}

run();
