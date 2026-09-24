import type { PhoneScene, PhoneSceneId, ScreenQuad } from "./types";

const BLANK_SCREEN =
  "The phone is a modern smartphone with a thin dark bezel. Its display is a completely blank matte-black rectangle: no app UI, no icons, no wallpaper, no notifications, no clock, no camera-cutout glyphs, and no invented interface. The glass looks unpowered and empty.";

export const PHONE_SCENES: Record<PhoneSceneId, PhoneScene> = {
  bathroom: {
    id: "bathroom",
    name: "Bathroom counter",
    detail: "Phone propped on a bathroom counter, facing the camera",
    prompt: [
      "Lifestyle photograph of a person at a bathroom counter in a real home, 9:16 portrait, natural window light, candid iPhone snapshot, not studio.",
      "A smartphone stands propped on the counter in the lower-center of the frame, facing the camera, occupying roughly the middle third of the image.",
      BLANK_SCREEN,
      "Do not draw any app screens, widgets, or fake UI onto the phone. Keep hands, toiletries, and the room natural. No text, logos, or watermarks.",
    ].join(" "),
    screen: {
      topLeft: { x: 0.38, y: 0.28 },
      topRight: { x: 0.66, y: 0.28 },
      bottomRight: { x: 0.7, y: 0.7 },
      bottomLeft: { x: 0.34, y: 0.7 },
    },
  },
  nightstand: {
    id: "nightstand",
    name: "Nightstand at night",
    detail: "Phone on a nightstand in warm lamplight",
    prompt: [
      "Lifestyle photograph of a person in bed at night next to a wooden nightstand, 9:16 portrait, warm lamp light, candid phone snapshot.",
      "A smartphone sits on the nightstand in the lower-center of the frame, slightly reclined toward the camera.",
      BLANK_SCREEN,
      "Do not draw any app screens, widgets, or fake UI onto the phone. Keep the bedroom natural. No text, logos, or watermarks.",
    ].join(" "),
    screen: {
      topLeft: { x: 0.3, y: 0.36 },
      topRight: { x: 0.7, y: 0.38 },
      bottomRight: { x: 0.66, y: 0.68 },
      bottomLeft: { x: 0.28, y: 0.7 },
    },
  },
  gym: {
    id: "gym",
    name: "Gym",
    detail: "Only when the tip fits a gym setting",
    prompt: [
      "Lifestyle photograph of a person at a gym, 9:16 portrait, available indoor light, candid phone snapshot. Use this scene only when the product tip belongs in a gym.",
      "A smartphone is propped on a bench or machine in the lower-center of the frame, facing the camera.",
      BLANK_SCREEN,
      "Do not draw any app screens, widgets, or fake UI onto the phone. Keep the gym natural. No text, logos, or watermarks.",
    ].join(" "),
    screen: {
      topLeft: { x: 0.4, y: 0.22 },
      topRight: { x: 0.64, y: 0.24 },
      bottomRight: { x: 0.66, y: 0.68 },
      bottomLeft: { x: 0.38, y: 0.7 },
    },
  },
};

export const PHONE_SCENE_IDS: PhoneSceneId[] = ["bathroom", "nightstand", "gym"];

export function isPhoneSceneId(value: string): value is PhoneSceneId {
  return value === "bathroom" || value === "nightstand" || value === "gym";
}

export function getPhoneScene(id: PhoneSceneId): PhoneScene {
  return PHONE_SCENES[id];
}

export function listPhoneScenes(): PhoneScene[] {
  return PHONE_SCENE_IDS.map((id) => PHONE_SCENES[id]);
}

export function screenQuadList(screen: ScreenQuad) {
  return [screen.topLeft, screen.topRight, screen.bottomRight, screen.bottomLeft];
}
