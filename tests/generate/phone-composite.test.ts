import assert from "node:assert/strict";
import sharp from "sharp";
import { compositePhoneScreenshot } from "../../src/lib/phone-composite/composite";
import { renderScenePlaceholder } from "../../src/lib/phone-composite/placeholder";
import {
  parsePhoneCompositeJson,
  PhoneCompositeRequestError,
} from "../../src/lib/phone-composite/request";
import { getPhoneScene, listPhoneScenes } from "../../src/lib/phone-composite/scenes";
import {
  PHONE_COMPOSITE_PLACEHOLDER_HEIGHT,
  PHONE_COMPOSITE_PLACEHOLDER_WIDTH,
} from "../../src/lib/phone-composite/types";

async function solidPng(
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
) {
  return sharp({
    create: { width, height, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}

function sample(
  raw: { data: Buffer; info: { width: number; channels: number } },
  x: number,
  y: number,
) {
  const index = (y * raw.info.width + x) * raw.info.channels;
  return [raw.data[index], raw.data[index + 1], raw.data[index + 2]];
}

async function run() {
  const scenes = listPhoneScenes();
  assert.deepEqual(
    scenes.map((scene) => scene.id),
    ["bathroom", "nightstand", "gym"],
  );
  for (const scene of scenes) {
    assert.match(scene.prompt, /blank matte-black/i);
    assert.match(scene.prompt, /no app UI/i);
  }

  assert.throws(
    () => parsePhoneCompositeJson({ scene: "bathroom", usePlaceholder: true }),
    PhoneCompositeRequestError,
  );

  const screenshotPng = await solidPng(80, 160, { r: 20, g: 180, b: 80 });
  const parsed = parsePhoneCompositeJson({
    scene: "bathroom",
    usePlaceholder: true,
    screenshot: { base64: screenshotPng.toString("base64"), mimeType: "image/png" },
  });
  assert.equal(parsed.scene, "bathroom");
  assert.equal(parsed.usePlaceholder, true);
  assert.equal(parsed.screenshot.kind, "buffer");

  const base = await solidPng(200, 300, { r: 220, g: 30, b: 30 });
  const screenshot = await sharp({
    create: {
      width: 40,
      height: 80,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([
      { input: await solidPng(20, 40, { r: 0, g: 255, b: 0 }), left: 0, top: 0 },
      { input: await solidPng(20, 40, { r: 0, g: 0, b: 255 }), left: 20, top: 40 },
    ])
    .png()
    .toBuffer();

  const screen = {
    topLeft: { x: 0.25, y: 0.2 },
    topRight: { x: 0.75, y: 0.2 },
    bottomRight: { x: 0.75, y: 0.8 },
    bottomLeft: { x: 0.25, y: 0.8 },
  };
  const warped = await compositePhoneScreenshot({ base, screenshot, screen });
  assert.equal(warped.width, 200);
  assert.equal(warped.height, 300);

  const raw = await sharp(warped.buffer).raw().toBuffer({ resolveWithObject: true });
  const outside = sample(raw, 8, 8);
  assert.ok(outside[0] > 180 && outside[1] < 60, "pixels outside the phone stay on the base");
  const insideTopLeft = sample(raw, 60, 80);
  assert.ok(
    insideTopLeft[1] > insideTopLeft[0] && insideTopLeft[1] > insideTopLeft[2],
    "top-left of the screen shows the screenshot green",
  );
  const insideBottomRight = sample(raw, 140, 210);
  assert.ok(
    insideBottomRight[2] > insideBottomRight[0] && insideBottomRight[2] > insideBottomRight[1],
    "bottom-right of the screen shows the screenshot blue",
  );

  const placeholder = await renderScenePlaceholder("bathroom");
  const meta = await sharp(placeholder).metadata();
  assert.equal(meta.width, PHONE_COMPOSITE_PLACEHOLDER_WIDTH);
  assert.equal(meta.height, PHONE_COMPOSITE_PLACEHOLDER_HEIGHT);

  const bathroom = getPhoneScene("bathroom");
  const placed = await compositePhoneScreenshot({
    base: placeholder,
    screenshot: screenshotPng,
    screen: bathroom.screen,
  });
  assert.equal(placed.width, PHONE_COMPOSITE_PLACEHOLDER_WIDTH);
  assert.equal(placed.height, PHONE_COMPOSITE_PLACEHOLDER_HEIGHT);

  console.log("phone composite tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
