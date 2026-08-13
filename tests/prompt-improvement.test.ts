import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import {
  buildPromptImprovementSystemInstruction,
  improveGenerationPrompt,
} from "../src/lib/ai/improve-prompt";
import {
  canRunPromptImprovement,
  createPromptImprovementRequestGate,
  invalidatePromptImprovementUndo,
  restorePromptImprovementUndo,
} from "../src/lib/ai/prompt-improvement-ui";
import { POST as improvePromptRoute } from "../src/app/api/prompts/improve/route";

const videoRequest = {
  prompt: "girl walks into kitchen and shows bottle",
  outputType: "video" as const,
  modelId: "seedance-2.0",
  modelName: "Seedance 2.0",
  aspectRatio: "9:16",
  duration: 8,
  enableAudio: false,
  hasCharacterReference: true,
  hasVisualReference: false,
};

const videoInstruction = buildPromptImprovementSystemInstruction(videoRequest);
assert.match(videoInstruction, /opening frame/i);
assert.match(videoInstruction, /action over time/i);
assert.match(videoInstruction, /camera behavior/i);
assert.match(videoInstruction, /8-second shot/);
assert.match(videoInstruction, /saved character identity/i);
assert.match(videoInstruction, /Native audio is disabled/i);
assert.match(videoInstruction, /Never invent brand claims/i);

const editInstruction = buildPromptImprovementSystemInstruction({
  ...videoRequest,
  modelId: "gemini-omni-edit",
  modelName: "Gemini Omni Edit",
  isVideoEdit: true,
  hasCharacterReference: false,
  hasVisualReference: true,
});
assert.match(editInstruction, /edit to an existing video/i);
assert.match(editInstruction, /what should change and what must remain unchanged/i);
assert.doesNotMatch(editInstruction, /Design one coherent/);

(async () => {
  const requestGate = createPromptImprovementRequestGate();
  const firstRequest = requestGate.begin();
  assert.ok(firstRequest);
  assert.equal(requestGate.begin(), null, "a second invocation is rejected while active");
  assert.equal(requestGate.isCurrent(firstRequest), true);
  requestGate.invalidateInputs();
  assert.equal(
    requestGate.isCurrent(firstRequest),
    false,
    "an input mutation invalidates an in-flight response synchronously"
  );
  requestGate.finish(firstRequest);
  const nextRequest = requestGate.begin();
  assert.ok(nextRequest, "a new request may start after the active request finishes");
  requestGate.finish(nextRequest);

  const improvedHistory = {
    promptBeforeImprovement: "rough prompt",
    promptImprovementNotice: "Prompt improved.",
  };
  assert.deepEqual(invalidatePromptImprovementUndo(), {
    promptBeforeImprovement: null,
    promptImprovementNotice: null,
  });
  assert.deepEqual(restorePromptImprovementUndo(improvedHistory), {
    prompt: "rough prompt",
    state: {
      promptBeforeImprovement: null,
      promptImprovementNotice: "Original prompt restored.",
    },
  });
  assert.equal(
    restorePromptImprovementUndo(invalidatePromptImprovementUndo()),
    null,
    "manual edits invalidate Undo instead of discarding later refinements"
  );

  assert.equal(
    canRunPromptImprovement({
      hasModel: true,
      hasPrompt: true,
      isRunning: false,
      configured: true,
    }),
    true
  );
  for (const unavailable of [
    { hasModel: false, hasPrompt: true, isRunning: false, configured: true },
    { hasModel: true, hasPrompt: false, isRunning: false, configured: true },
    { hasModel: true, hasPrompt: true, isRunning: true, configured: true },
    { hasModel: true, hasPrompt: true, isRunning: false, configured: false },
  ]) {
    assert.equal(canRunPromptImprovement(unavailable), false);
  }

  const crossOriginResponse = await improvePromptRoute(
    new NextRequest("http://localhost/api/prompts/improve", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Origin: "https://attacker.example",
        "Sec-Fetch-Site": "cross-site",
      },
      body: "{}",
    })
  );
  assert.equal(crossOriginResponse.status, 403);
  assert.deepEqual(await crossOriginResponse.json(), {
    error: "Same-origin request required",
  });

  const emptyPromptResponse = await improvePromptRoute(
    new NextRequest("http://localhost/api/prompts/improve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost",
        "Sec-Fetch-Site": "same-origin",
      },
      body: JSON.stringify({
        prompt: "",
        model: "seedance-2.0",
        aspectRatio: "9:16",
        duration: 8,
      }),
    })
  );
  assert.equal(emptyPromptResponse.status, 400);

  let capturedUrl = "";
  let capturedBody = "";
  const result = await improveGenerationPrompt(videoRequest, {
    model: "gemini-test-flash",
    apiKey: "test-key",
    fetchImpl: async (input, init) => {
      capturedUrl = String(input);
      capturedBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  prompt:
                    "Opening frame: the selected character enters a sunlit kitchen, then lifts the bottle toward camera as a slow handheld push-in settles on the label.",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    },
  });
  assert.equal(result.model, "gemini-test-flash");
  assert.match(result.prompt, /Opening frame/);
  assert.match(capturedUrl, /ollama\.com\/v1\/chat\/completions/);
  assert.match(capturedBody, /"model":"gemini-test-flash"/);
  assert.match(capturedBody, /girl walks into kitchen and shows bottle/);
  assert.match(capturedBody, /Native audio is disabled/);

  await assert.rejects(
    () =>
      improveGenerationPrompt(videoRequest, {
        model: "gemini-test-flash",
        apiKey: "test-key",
        fetchImpl: async () => new Response("unavailable", { status: 503 }),
      }),
    /HTTP 503.*original prompt is unchanged/i
  );

  const formSource = readFileSync(
    new URL("../src/components/generation-form.tsx", import.meta.url),
    "utf8"
  );
  const routeSource = readFileSync(
    new URL("../src/app/api/prompts/improve/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(formSource, /\/api\/prompts\/improve/);
  assert.match(formSource, /Prompt improved for/);
  assert.match(formSource, /Your prompt or generation settings changed/);
  assert.match(formSource, /onUndoPromptImprovement/);
  assert.match(formSource, /promptImprovementRequestGateRef/);
  assert.match(formSource, /invalidatePromptImprovementUndo/);
  assert.match(formSource, /min-h-9/);
  assert.match(formSource, /\/settings\?tab=api-keys/);
  assert.match(routeSource, /getModel\(modelId\)/);
  assert.match(routeSource, /isSameOriginMutation\(request\)/);
  assert.match(routeSource, /Connect Ollama\/i\.test\(message\)[\s\S]*503/);
  assert.match(routeSource, /hasCharacterReference/);
  assert.match(routeSource, /hasVisualReference/);
  assert.match(routeSource, /Cache-Control/);

  console.log("prompt improvement tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
