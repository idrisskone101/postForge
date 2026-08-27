import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parsePromptTemplateRecords,
  PROMPT_TEMPLATE_PROMPT_MAX_LENGTH,
} from "../../src/lib/prompt-templates";
import { buildAvatarScenePrompt } from "../../src/lib/ugc/generate-avatar-image";
import {
  BEFORE_IDENTITY_HAIR_DIRECTIVE,
  BEFORE_IDENTITY_NEGATIVE_PROMPT,
  BEFORE_IDENTITY_PROMPT,
  BEFORE_IDENTITY_TEMPLATE_ID,
  isBeforeIdentityPrompt,
  resolveAvatarGenerationPrompt,
} from "../../src/lib/ugc/before-identity-prompt";

const STRENGTH_MARKERS = [
  "Balding must be obvious at a glance",
  "deep M-shaped temple recession",
  "receded uneven hairline",
  "heavy diffuse thinning across the whole top",
  "scalp clearly visible through sparse separated strands",
  "Do not give him a full or thick head of hair",
  "If the scalp is not immediately obvious, the image failed",
];

for (const marker of STRENGTH_MARKERS) {
  assert.match(BEFORE_IDENTITY_PROMPT, new RegExp(marker));
}
assert.match(BEFORE_IDENTITY_PROMPT, /Use the supplied avatar as the exact person/);
assert.match(BEFORE_IDENTITY_PROMPT, /9:16 iPhone front-camera bathroom selfie/);
assert.equal(BEFORE_IDENTITY_PROMPT.length <= PROMPT_TEMPLATE_PROMPT_MAX_LENGTH, true);
assert.match(BEFORE_IDENTITY_NEGATIVE_PROMPT, /full head of hair/);
assert.match(BEFORE_IDENTITY_NEGATIVE_PROMPT, /thick hair/);
assert.match(BEFORE_IDENTITY_NEGATIVE_PROMPT, /no visible scalp/);
assert.equal(isBeforeIdentityPrompt(BEFORE_IDENTITY_PROMPT), true);
assert.equal(
  isBeforeIdentityPrompt("Bathroom selfie of the avatar with a slightly receding hairline."),
  false
);

const builtins = parsePromptTemplateRecords([]);
const beforeTemplate = builtins.find((record) => record.id === BEFORE_IDENTITY_TEMPLATE_ID);
assert.ok(beforeTemplate, "empty workspaces still expose the Before identity template");
assert.equal(beforeTemplate.name, "Before");
assert.equal(beforeTemplate.prompt, BEFORE_IDENTITY_PROMPT);
assert.equal(beforeTemplate.prompt.length <= PROMPT_TEMPLATE_PROMPT_MAX_LENGTH, true);

const storedOverride = parsePromptTemplateRecords([
  {
    id: BEFORE_IDENTITY_TEMPLATE_ID,
    kind: "prompt-template",
    name: "Before",
    prompt: BEFORE_IDENTITY_PROMPT,
    createdAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-26T12:00:00.000Z",
  },
]);
assert.equal(storedOverride.length, 1);
assert.equal(storedOverride[0]?.updatedAt, "2026-08-26T12:00:00.000Z");

const jsonTemplate = JSON.stringify({
  prompt: BEFORE_IDENTITY_PROMPT,
  aspect_ratio: "9:16",
  negative_prompt: BEFORE_IDENTITY_NEGATIVE_PROMPT,
});
const fromJson = resolveAvatarGenerationPrompt({
  prompt: jsonTemplate,
  aspectRatio: "1:1",
  negativePrompt: "",
});
assert.equal(fromJson.prompt, BEFORE_IDENTITY_PROMPT);
assert.equal(fromJson.aspectRatio, "9:16");
assert.match(fromJson.negativePrompt ?? "", /full head of hair/);
assert.equal(fromJson.hairstyleDirective, BEFORE_IDENTITY_HAIR_DIRECTIVE);
assert.doesNotMatch(fromJson.prompt, /^\s*\{/);

const fromProse = resolveAvatarGenerationPrompt({
  prompt: `  ${BEFORE_IDENTITY_PROMPT}  `,
  aspectRatio: "1:1",
});
assert.equal(fromProse.prompt, BEFORE_IDENTITY_PROMPT);
assert.equal(fromProse.aspectRatio, "9:16");
assert.match(fromProse.negativePrompt ?? "", /full head of hair/);
assert.equal(fromProse.hairstyleDirective, BEFORE_IDENTITY_HAIR_DIRECTIVE);

const afterScene = resolveAvatarGenerationPrompt({
  prompt: "The same man in a kitchen, full after result, keep his current hairstyle.",
  aspectRatio: "9:16",
  negativePrompt: "cartoon",
});
assert.equal(afterScene.hairstyleDirective, undefined);
assert.equal(afterScene.prompt.includes("keep his current hairstyle"), true);
assert.equal(afterScene.negativePrompt, "cartoon");
assert.doesNotMatch(afterScene.negativePrompt ?? "", /full head of hair/);

const beforeScene = buildAvatarScenePrompt(fromProse.prompt, {
  hairstyleDirective: fromProse.hairstyleDirective,
});
assert.match(beforeScene, /Balding must be obvious at a glance/);
assert.match(beforeScene, /do not copy hairline/i);
assert.match(beforeScene, /hair color, hair style, hair length/);

const generateAvatarSource = readFileSync(
  new URL("../../src/lib/ugc/generate-avatar-image.ts", import.meta.url),
  "utf8"
);
assert.match(generateAvatarSource, /resolveAvatarGenerationPrompt/);
assert.match(
  generateAvatarSource,
  /resolved\.hairstyleDirective/
);

const promptTemplateSource = readFileSync(
  new URL("../../src/lib/prompt-templates.ts", import.meta.url),
  "utf8"
);
assert.match(promptTemplateSource, /withBuiltinPromptTemplates/);
assert.match(promptTemplateSource, /BEFORE_IDENTITY_TEMPLATE_ID/);

const controlSource = readFileSync(
  new URL("../../src/app/(app)/generate/prompt-templates-control.tsx", import.meta.url),
  "utf8"
);
assert.match(controlSource, /BEFORE_IDENTITY_TEMPLATE_ID/);

console.log("before identity prompt tests passed");
