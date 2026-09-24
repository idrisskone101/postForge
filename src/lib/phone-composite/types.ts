export type PhoneSceneId = "bathroom" | "nightstand" | "gym";

export type Point = {
  x: number;
  y: number;
};

export type ScreenQuad = {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
};

export type PhoneScene = {
  id: PhoneSceneId;
  name: string;
  detail: string;
  prompt: string;
  screen: ScreenQuad;
};

export type PhoneCompositeCornerInput = {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
};

export type PhoneCompositeImageSource =
  | { kind: "buffer"; bytes: Buffer; mimeType: string }
  | { kind: "generated-file"; id: string };

export type ParsedPhoneCompositeRequest = {
  scene: PhoneSceneId;
  usePlaceholder: boolean;
  base: PhoneCompositeImageSource | null;
  screenshot: PhoneCompositeImageSource;
  corners: ScreenQuad | null;
};

export const PHONE_COMPOSITE_MODEL = "phone-composite";
export const PHONE_COMPOSITE_TAG = "phone-composite";
export const PHONE_COMPOSITE_MAX_BYTES = 25 * 1024 * 1024;
export const PHONE_COMPOSITE_MAX_EDGE = 4096;
export const PHONE_COMPOSITE_PLACEHOLDER_WIDTH = 1080;
export const PHONE_COMPOSITE_PLACEHOLDER_HEIGHT = 1920;
