import assert from "node:assert/strict";
import { analyzeSceneAndBuildPrompt } from "../../src/lib/ai/analyze-scene";

void (async () => {
  const { promptJson, promptString, negativePrompt } = await analyzeSceneAndBuildPrompt(
    "/tmp/source-frame.jpg",
    "Keep the avatar attractive and approachable.",
    { poseEmphasis: true }
  );

  assert.match(promptString, /trendy/i);
  assert.match(promptString, /attractive but approachable/i);
  assert.match(promptString, /not intimidating/i);
  assert.match(promptString, /mildly revealing but tasteful/i);
  assert.match(promptString, /cleavage/i);
  assert.match(promptString, /crop tops/i);
  assert.match(promptString, /off-shoulder/i);
  assert.match(promptString, /halter/i);
  assert.match(promptString, /corset-inspired/i);
  assert.match(promptString, /lace-trim/i);
  assert.match(promptString, /different colors/i);
  assert.match(promptString, /not just basic shirts/i);
  assert.match(promptString, /avoid defaulting to flannels/i);
  assert.match(promptString, /visible skin texture/i);
  assert.match(promptString, /phone compression/i);

  assert.match(promptJson.clothing.outfit, /mildly revealing but tasteful/i);
  assert.match(promptJson.clothing.style, /attractive but approachable/i);
  assert.match(promptJson.clothing.style, /not intimidating/i);
  assert.match(promptJson.tiktok_aesthetic.texture, /phone-camera texture/i);
  assert.match(negativePrompt, /glossy skin/);
})();
