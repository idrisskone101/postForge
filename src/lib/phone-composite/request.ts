import type {
  ParsedPhoneCompositeRequest,
  PhoneCompositeImageSource,
  Point,
  ScreenQuad,
} from "./types";
import { PHONE_COMPOSITE_MAX_BYTES } from "./types";
import { isPhoneSceneId } from "./scenes";

export class PhoneCompositeRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PhoneCompositeRequestError";
    this.status = status;
  }
}

export async function parsePhoneCompositeForm(
  form: FormData,
): Promise<ParsedPhoneCompositeRequest> {
  const sceneValue = readFormString(form, "scene");
  if (!sceneValue || !isPhoneSceneId(sceneValue)) {
    throw new PhoneCompositeRequestError(
      "scene must be bathroom, nightstand, or gym",
    );
  }
  const usePlaceholder = readFormString(form, "usePlaceholder") === "true";
  const corners = parseCornersField(form.get("corners"));
  const screenshot = await readImageSource(form, "screenshot", "screenshotFileId");
  if (!screenshot) {
    throw new PhoneCompositeRequestError(
      "A real screenshot PNG is required. The model must not invent app UI.",
    );
  }
  const base = await readImageSource(form, "base", "baseFileId");
  if (!usePlaceholder && !base) {
    throw new PhoneCompositeRequestError(
      "Upload a blank-screen lifestyle photo or use the scene placement preview.",
    );
  }
  return {
    scene: sceneValue,
    usePlaceholder,
    base,
    screenshot,
    corners,
  };
}

export function parsePhoneCompositeJson(body: unknown): ParsedPhoneCompositeRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PhoneCompositeRequestError("Request body must be a JSON object");
  }
  const record = body as Record<string, unknown>;
  const sceneValue = typeof record.scene === "string" ? record.scene : "";
  if (!isPhoneSceneId(sceneValue)) {
    throw new PhoneCompositeRequestError(
      "scene must be bathroom, nightstand, or gym",
    );
  }
  const usePlaceholder = record.usePlaceholder === true;
  const screenshot = readJsonImageSource(record, "screenshot", "screenshotFileId");
  if (!screenshot) {
    throw new PhoneCompositeRequestError(
      "A real screenshot PNG is required. The model must not invent app UI.",
    );
  }
  const base = readJsonImageSource(record, "base", "baseFileId");
  if (!usePlaceholder && !base) {
    throw new PhoneCompositeRequestError(
      "Upload a blank-screen lifestyle photo or use the scene placement preview.",
    );
  }
  return {
    scene: sceneValue,
    usePlaceholder,
    base,
    screenshot,
    corners: parseCornersValue(record.corners),
  };
}

function readFormString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function readImageSource(
  form: FormData,
  fileKey: string,
  idKey: string,
): Promise<PhoneCompositeImageSource | null> {
  const file = form.get(fileKey);
  if (file instanceof File) {
    if (file.size <= 0) {
      throw new PhoneCompositeRequestError(`${fileKey} is empty`);
    }
    if (file.size > PHONE_COMPOSITE_MAX_BYTES) {
      throw new PhoneCompositeRequestError("Images must be 25 MB or smaller");
    }
    if (file.type && !file.type.startsWith("image/")) {
      throw new PhoneCompositeRequestError("Only image files are supported");
    }
    return {
      kind: "buffer",
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "image/png",
    };
  }
  const id = readFormString(form, idKey);
  if (!id) return null;
  if (id.length > 100) {
    throw new PhoneCompositeRequestError(`${idKey} is too long`);
  }
  return { kind: "generated-file", id };
}

function readJsonImageSource(
  record: Record<string, unknown>,
  fileKey: string,
  idKey: string,
): PhoneCompositeImageSource | null {
  const file = record[fileKey];
  if (file && typeof file === "object" && !Array.isArray(file)) {
    const payload = file as Record<string, unknown>;
    if (typeof payload.base64 !== "string" || payload.base64.length === 0) {
      throw new PhoneCompositeRequestError(`${fileKey}.base64 is required`);
    }
    const bytes = Buffer.from(payload.base64, "base64");
    if (bytes.length > PHONE_COMPOSITE_MAX_BYTES) {
      throw new PhoneCompositeRequestError("Images must be 25 MB or smaller");
    }
    const mimeType =
      typeof payload.mimeType === "string" && payload.mimeType.startsWith("image/")
        ? payload.mimeType
        : "image/png";
    return { kind: "buffer", bytes, mimeType };
  }
  const id = record[idKey];
  if (id === undefined || id === null) return null;
  if (typeof id !== "string" || id.trim().length === 0 || id.length > 100) {
    throw new PhoneCompositeRequestError(`${idKey} must be a generated file id`);
  }
  return { kind: "generated-file", id: id.trim() };
}

function parseCornersField(value: FormDataEntryValue | null): ScreenQuad | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new PhoneCompositeRequestError("corners must be a JSON object");
  }
  try {
    return parseCornersValue(JSON.parse(value));
  } catch (error) {
    if (error instanceof PhoneCompositeRequestError) throw error;
    throw new PhoneCompositeRequestError("corners must be valid JSON");
  }
}

function parseCornersValue(value: unknown): ScreenQuad | null {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PhoneCompositeRequestError("corners must be an object");
  }
  const record = value as Record<string, unknown>;
  return {
    topLeft: parsePoint(record.topLeft, "corners.topLeft"),
    topRight: parsePoint(record.topRight, "corners.topRight"),
    bottomRight: parsePoint(record.bottomRight, "corners.bottomRight"),
    bottomLeft: parsePoint(record.bottomLeft, "corners.bottomLeft"),
  };
}

function parsePoint(value: unknown, key: string): Point {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PhoneCompositeRequestError(`${key} must be { x, y }`);
  }
  const record = value as Record<string, unknown>;
  const x = record.x;
  const y = record.y;
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new PhoneCompositeRequestError(`${key} x and y must be finite numbers`);
  }
  if (x < 0 || x > 1 || y < 0 || y > 1) {
    throw new PhoneCompositeRequestError(`${key} x and y must be between 0 and 1`);
  }
  return { x, y };
}
