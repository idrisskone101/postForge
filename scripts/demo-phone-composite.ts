import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { compositePhoneScreenshot } from "../src/lib/phone-composite/composite";
import { renderScenePlaceholder } from "../src/lib/phone-composite/placeholder";
import { getPhoneScene } from "../src/lib/phone-composite/scenes";

async function main() {
  const outDir = process.argv[2] || "/opt/cursor/artifacts";
  mkdirSync(outDir, { recursive: true });

  const screenshotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#0b0b0c"/>
  <rect x="48" y="72" width="984" height="120" rx="24" fill="#16161a"/>
  <text x="72" y="148" fill="#fafafa" font-family="ui-sans-serif, system-ui, sans-serif" font-size="44" font-weight="700">HairTrace Today</text>
  <rect x="48" y="232" width="984" height="280" rx="28" fill="#1c1c20"/>
  <text x="88" y="320" fill="#a1a1aa" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28">Morning check-in</text>
  <text x="88" y="390" fill="#fafafa" font-family="ui-sans-serif, system-ui, sans-serif" font-size="64" font-weight="700">Day 24</text>
  <rect x="48" y="552" width="984" height="420" rx="28" fill="#131316"/>
  <text x="88" y="640" fill="#a1a1aa" font-family="ui-sans-serif, system-ui, sans-serif" font-size="26">Today</text>
  <text x="88" y="720" fill="#fafafa" font-family="ui-sans-serif, system-ui, sans-serif" font-size="40" font-weight="600">Apply serum, then photos</text>
  <text x="88" y="790" fill="#a1a1aa" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28">Keep lighting the same as yesterday.</text>
  <rect x="48" y="1012" width="984" height="160" rx="28" fill="#ff4a20"/>
  <text x="540" y="1110" text-anchor="middle" fill="#ffffff" font-family="ui-sans-serif, system-ui, sans-serif" font-size="36" font-weight="700">Log today</text>
</svg>`;

  const screenshot = await sharp(Buffer.from(screenshotSvg)).png().toBuffer();
  const screenshotPath = path.join(outDir, "sample_hairtrace_today_screenshot.png");
  writeFileSync(screenshotPath, screenshot);

  const base = await renderScenePlaceholder("bathroom");
  const basePath = path.join(outDir, "phone_composite_bathroom_base.png");
  writeFileSync(basePath, base);

  const result = await compositePhoneScreenshot({
    base,
    screenshot,
    screen: getPhoneScene("bathroom").screen,
  });
  const resultPath = path.join(outDir, "phone_composite_bathroom_result.png");
  writeFileSync(resultPath, result.buffer);

  console.log(
    JSON.stringify(
      {
        screenshotPath,
        basePath,
        resultPath,
        width: result.width,
        height: result.height,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
