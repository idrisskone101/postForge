import sharp from "sharp";
import type { PhoneScene, PhoneSceneId } from "./types";
import {
  PHONE_COMPOSITE_PLACEHOLDER_HEIGHT,
  PHONE_COMPOSITE_PLACEHOLDER_WIDTH,
} from "./types";
import { getPhoneScene, screenQuadList } from "./scenes";

const SCENE_BACKDROPS: Record<PhoneSceneId, { fill: string; accent: string }> = {
  bathroom: { fill: "rgb(216, 207, 196)", accent: "rgb(185, 168, 154)" },
  nightstand: { fill: "rgb(28, 26, 36)", accent: "rgb(58, 47, 40)" },
  gym: { fill: "rgb(77, 83, 72)", accent: "rgb(107, 113, 102)" },
};

export async function renderScenePlaceholder(sceneId: PhoneSceneId): Promise<Buffer> {
  const scene = getPhoneScene(sceneId);
  const width = PHONE_COMPOSITE_PLACEHOLDER_WIDTH;
  const height = PHONE_COMPOSITE_PLACEHOLDER_HEIGHT;
  const backdrop = SCENE_BACKDROPS[sceneId];
  const svg = placeholderMarkup(scene, width, height, backdrop);
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: backdrop.fill,
    },
  })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

function placeholderMarkup(
  scene: PhoneScene,
  width: number,
  height: number,
  backdrop: { fill: string; accent: string },
) {
  const screen = screenQuadList(scene.screen).map((point) => ({
    x: point.x * width,
    y: point.y * height,
  }));
  const bezel = expandQuad(screen, 18);
  const screenPoints = screen.map((point) => `${point.x},${point.y}`).join(" ");
  const bezelPoints = bezel.map((point) => `${point.x},${point.y}`).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${backdrop.fill}"/>
  <ellipse cx="${width * 0.5}" cy="${height * 0.86}" rx="${width * 0.42}" ry="${height * 0.08}" fill="${backdrop.accent}" opacity="0.55"/>
  <polygon points="${bezelPoints}" fill="rgb(26, 26, 26)"/>
  <polygon points="${screenPoints}" fill="#09090B"/>
</svg>`;
}

function expandQuad(
  points: Array<{ x: number; y: number }>,
  amount: number,
) {
  const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  return points.map((point) => {
    const dx = point.x - cx;
    const dy = point.y - cy;
    const length = Math.hypot(dx, dy) || 1;
    return {
      x: point.x + (dx / length) * amount,
      y: point.y + (dy / length) * amount,
    };
  });
}
