import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MODULE_SIZE_CAP } from "../../scripts/check-module-size";
import { MODEL_REGISTRY, getModel } from "../../src/lib/ai/models";
import { parseSlideshowAestheticTemplate } from "../../src/lib/ai/slideshow-creator";
import { buildSlideshowImagePrompt } from "../../src/lib/ai/slideshow-image";
import { isSlideshowRemoteImageUrlAllowed } from "../../src/lib/ai/slideshow-renderer";
import { buildCharacterVideoProviderRequest } from "../../src/lib/ai/generate-character-video";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function newlineCount(relativePath: string): number {
  const bytes = readFileSync(path.join(repoRoot, relativePath));
  let lines = 0;
  for (const byte of bytes) {
    if (byte === 10) lines += 1;
  }
  return lines;
}

const splitFiles = [
  "src/lib/ai/models.ts",
  "src/lib/ai/model-registry.ts",
  "src/lib/ai/slideshow-creator.ts",
  "src/lib/ai/slideshow-aesthetic.ts",
  "src/lib/ai/slideshow-creator-prompt.ts",
  "src/lib/ai/slideshow-creator-derive.ts",
  "src/lib/ai/slideshow-image.ts",
  "src/lib/ai/slideshow-image-queue.ts",
  "src/lib/ai/slideshow-image-submit.ts",
  "src/lib/ai/slideshow-renderer.ts",
  "src/lib/ai/slideshow-render-background.ts",
  "src/lib/ai/generate-character-video.ts",
  "src/lib/ai/character-video-payload.ts",
  "src/lib/ai/character-video-submit.ts",
  "src/lib/ai/character-video-worker.ts",
];

for (const file of splitFiles) {
  const lines = newlineCount(file);
  assert.ok(
    lines <= MODULE_SIZE_CAP,
    `${file} is ${lines} lines (cap ${MODULE_SIZE_CAP})`
  );
}

assert.equal(existsSync(path.join(repoRoot, "src/lib/ai/index.ts")), false);
const aiDir = path.join(repoRoot, "src/lib/ai");
for (const entry of readdirSync(aiDir, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    assert.equal(
      existsSync(path.join(aiDir, entry.name, "index.ts")),
      false,
      `${entry.name}/index.ts must not exist`
    );
  }
}

assert.ok(getModel("nano-banana-2"));
assert.equal(MODEL_REGISTRY["nano-banana-2"]?.id, "nano-banana-2");
assert.equal(
  parseSlideshowAestheticTemplate({
    aesthetic: { core_vibe: "quiet luxury", mood: ["calm"] },
    visual_style: { genre: "editorial lifestyle photography" },
  }).aesthetic.core_vibe,
  "quiet luxury"
);
assert.match(buildSlideshowImagePrompt("a morning desk"), /no text/i);
assert.equal(
  isSlideshowRemoteImageUrlAllowed("https://images.unsplash.com/photo.jpg"),
  true
);
assert.equal(
  isSlideshowRemoteImageUrlAllowed("http://images.unsplash.com/photo.jpg"),
  false
);

const kling = buildCharacterVideoProviderRequest({
  strategy: "kling-element",
  prompt: "walks through a kitchen",
  anchorUrl: "https://example.com/anchor.jpg",
  identityUrls: ["https://example.com/front.jpg"],
  identityElement: {
    frontal_image_url: "https://example.com/front.jpg",
    reference_image_urls: ["https://example.com/left.jpg"],
  },
  duration: 8,
  aspectRatio: "9:16",
  enableAudio: false,
});
assert.equal(
  kling.endpoint,
  "fal-ai/kling-video/v3/standard/image-to-video"
);

const deriveSource = readFileSync(
  path.join(repoRoot, "src/lib/ai/slideshow-creator-derive.ts"),
  "utf8"
);
assert.match(deriveSource, /An Ollama connection is required/);
assert.match(
  deriveSource,
  /never silently replaced with a generic template/
);

const sourcePins = {
  "src/lib/ai/models.ts": "export function calculateEstimatedCost",
  "src/lib/ai/slideshow-creator.ts": "export async function generateSlideshowCreatorVisuals",
  "src/lib/ai/slideshow-image.ts": "export async function recoverQueuedSlideshowImageJobs",
  "src/lib/ai/slideshow-renderer.ts": "export async function renderSlideshowSlide",
  "src/lib/ai/generate-character-video.ts": "export async function generateCharacterVideo",
} as const;

for (const [file, needle] of Object.entries(sourcePins)) {
  const source = readFileSync(path.join(repoRoot, file), "utf8");
  assert.match(source, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

console.log(
  splitFiles
    .map((file) => `${newlineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
