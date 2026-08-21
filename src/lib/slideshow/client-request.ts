export type JsonRecord = Record<string, unknown>;

export class SlideshowApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "SlideshowApiError";
    this.status = status;
    this.code = code;
  }
}

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function readJsonResponse(response: Response) {
  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const record = isRecord(data) ? data : {};
    throw new SlideshowApiError(
      asString(record.error, `Request failed (${response.status})`),
      response.status,
      asString(record.code) || undefined,
    );
  }
  return data;
}

export function unwrapProject(data: unknown) {
  if (isRecord(data) && isRecord(data.project)) return data.project;
  return data;
}

export function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}
