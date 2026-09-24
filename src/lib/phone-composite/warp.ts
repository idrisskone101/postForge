import type { Point, ScreenQuad } from "./types";
import { screenQuadList } from "./scenes";
import { applyHomography, findHomography, invertHomography } from "./homography";

export type RawRgba = {
  data: Buffer;
  width: number;
  height: number;
};

export function warpScreenshotOntoQuad(
  base: RawRgba,
  screenshot: RawRgba,
  screen: ScreenQuad,
): Buffer {
  const dest = screenQuadList(screen).map((point) => ({
    x: point.x * (base.width - 1),
    y: point.y * (base.height - 1),
  }));
  assertUsableQuad(dest);
  const source = [
    { x: 0, y: 0 },
    { x: screenshot.width - 1, y: 0 },
    { x: screenshot.width - 1, y: screenshot.height - 1 },
    { x: 0, y: screenshot.height - 1 },
  ];
  const inverse = invertHomography(findHomography(source, dest));
  const output = Buffer.from(base.data);
  const minX = Math.max(0, Math.floor(Math.min(...dest.map((point) => point.x))));
  const maxX = Math.min(
    base.width - 1,
    Math.ceil(Math.max(...dest.map((point) => point.x))),
  );
  const minY = Math.max(0, Math.floor(Math.min(...dest.map((point) => point.y))));
  const maxY = Math.min(
    base.height - 1,
    Math.ceil(Math.max(...dest.map((point) => point.y))),
  );

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const mapped = applyHomography(inverse, { x, y });
      if (
        !Number.isFinite(mapped.x) ||
        !Number.isFinite(mapped.y) ||
        mapped.x < -0.5 ||
        mapped.y < -0.5 ||
        mapped.x > screenshot.width - 0.5 ||
        mapped.y > screenshot.height - 0.5
      ) {
        continue;
      }
      const sample = sampleBilinear(screenshot, mapped.x, mapped.y);
      if (sample[3] <= 0) continue;
      const destIndex = (y * base.width + x) * 4;
      const alpha = sample[3] / 255;
      output[destIndex] = Math.round(
        sample[0] * alpha + output[destIndex] * (1 - alpha),
      );
      output[destIndex + 1] = Math.round(
        sample[1] * alpha + output[destIndex + 1] * (1 - alpha),
      );
      output[destIndex + 2] = Math.round(
        sample[2] * alpha + output[destIndex + 2] * (1 - alpha),
      );
      output[destIndex + 3] = 255;
    }
  }
  return output;
}

function assertUsableQuad(points: Point[]) {
  const area = Math.abs(
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2,
  );
  if (area < 16) {
    throw new Error("The phone screen corners are too small to composite onto.");
  }
}

function sampleBilinear(image: RawRgba, x: number, y: number): [number, number, number, number] {
  const maxX = image.width - 1;
  const maxY = image.height - 1;
  const clampedX = Math.min(maxX, Math.max(0, x));
  const clampedY = Math.min(maxY, Math.max(0, y));
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(maxX, x0 + 1);
  const y1 = Math.min(maxY, y0 + 1);
  const tx = clampedX - x0;
  const ty = clampedY - y0;
  const c00 = pixel(image, x0, y0);
  const c10 = pixel(image, x1, y0);
  const c01 = pixel(image, x0, y1);
  const c11 = pixel(image, x1, y1);
  return [
    lerp(lerp(c00[0], c10[0], tx), lerp(c01[0], c11[0], tx), ty),
    lerp(lerp(c00[1], c10[1], tx), lerp(c01[1], c11[1], tx), ty),
    lerp(lerp(c00[2], c10[2], tx), lerp(c01[2], c11[2], tx), ty),
    lerp(lerp(c00[3], c10[3], tx), lerp(c01[3], c11[3], tx), ty),
  ];
}

function pixel(
  image: RawRgba,
  x: number,
  y: number,
): [number, number, number, number] {
  const index = (y * image.width + x) * 4;
  return [
    image.data[index],
    image.data[index + 1],
    image.data[index + 2],
    image.data[index + 3],
  ];
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}
