import sharp from "sharp";
import type { ScreenQuad } from "./types";
import { PHONE_COMPOSITE_MAX_EDGE } from "./types";
import { warpScreenshotOntoQuad, type RawRgba } from "./warp";

export async function compositePhoneScreenshot(input: {
  base: Buffer;
  screenshot: Buffer;
  screen: ScreenQuad;
}): Promise<{ buffer: Buffer; width: number; height: number }> {
  const [base, screenshot] = await Promise.all([
    decodeRgba(input.base),
    decodeRgba(input.screenshot),
  ]);
  const warped = warpScreenshotOntoQuad(base, screenshot, input.screen);
  const buffer = await sharp(warped, {
    raw: { width: base.width, height: base.height, channels: 4 },
  })
    .png()
    .toBuffer();
  return { buffer, width: base.width, height: base.height };
}

async function decodeRgba(bytes: Buffer): Promise<RawRgba> {
  const image = sharp(bytes, { failOn: "none", limitInputPixels: 50_000_000 });
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < 8 || height < 8) {
    throw new Error("Images must be at least 8px on each edge.");
  }
  if (width > PHONE_COMPOSITE_MAX_EDGE || height > PHONE_COMPOSITE_MAX_EDGE) {
    throw new Error(
      `Images must be ${PHONE_COMPOSITE_MAX_EDGE}px or smaller on each edge.`,
    );
  }
  const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width, height };
}
