import type { Prisma } from "@/generated/prisma/client";
import { badRequest } from "@/lib/slideshow/errors";

export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireRecord(value: unknown, label = "body"): JsonRecord {
  if (!isRecord(value)) {
    badRequest(`${label} must be a JSON object`);
  }
  return value;
}

export function requireRevision(body: JsonRecord): number {
  const revision = body.revision;
  if (!Number.isInteger(revision) || (revision as number) < 1) {
    badRequest("revision must be a positive integer", "invalid_revision");
  }
  return revision as number;
}

export function optionalString(
  body: JsonRecord,
  key: string,
  options: { max?: number; nullable: true; trim?: boolean }
): string | null | undefined;
export function optionalString(
  body: JsonRecord,
  key: string,
  options?: { max?: number; nullable?: false; trim?: boolean }
): string | undefined;
export function optionalString(
  body: JsonRecord,
  key: string,
  options: { max?: number; nullable?: boolean; trim?: boolean } = {}
): string | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null && options.nullable) return null;
  if (typeof value !== "string") {
    badRequest(`${key} must be a string${options.nullable ? " or null" : ""}`);
  }

  const result = options.trim === false ? value : value.trim();
  if (!result) {
    if (options.nullable) return null;
    badRequest(`${key} must not be empty`);
  }
  if (result.length > (options.max ?? 500)) {
    badRequest(`${key} must be at most ${options.max ?? 500} characters`);
  }
  return result;
}

export function requiredString(
  body: JsonRecord,
  key: string,
  options: { max?: number; trim?: boolean } = {}
): string {
  const value = optionalString(body, key, options);
  if (value === undefined || value === null) {
    badRequest(`${key} is required`);
  }
  return value as string;
}

export function optionalInteger(
  body: JsonRecord,
  key: string,
  options: { min?: number; max?: number } = {}
): number | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (!Number.isInteger(value)) badRequest(`${key} must be an integer`);
  const number = value as number;
  if (options.min !== undefined && number < options.min) {
    badRequest(`${key} must be at least ${options.min}`);
  }
  if (options.max !== undefined && number > options.max) {
    badRequest(`${key} must be at most ${options.max}`);
  }
  return number;
}

export function optionalEnum<const T extends readonly string[]>(
  body: JsonRecord,
  key: string,
  values: T
): T[number] | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !values.includes(value)) {
    badRequest(`${key} must be one of: ${values.join(", ")}`);
  }
  return value as T[number];
}

export function optionalJsonObject(
  body: JsonRecord,
  key: string
): Prisma.InputJsonObject | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (!isRecord(value)) badRequest(`${key} must be a JSON object`);
  return cloneJson(value) as Prisma.InputJsonObject;
}

export function asJsonObject(value: unknown): Prisma.InputJsonObject {
  if (!isRecord(value)) badRequest("value must be a JSON object");
  return cloneJson(value) as Prisma.InputJsonObject;
}

export function cloneJson<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    badRequest("value must be JSON-serializable");
  }
}

export function optionalNullableDate(
  body: JsonRecord,
  key: string
): Date | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    badRequest(`${key} must be an ISO date string or null`);
  }
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    badRequest(`${key} must be a valid ISO date string or null`);
  }
  return date;
}

export function optionalId(
  body: JsonRecord,
  key: string,
  nullable = false
): string | null | undefined {
  return nullable
    ? optionalString(body, key, { max: 100, nullable: true })
    : optionalString(body, key, { max: 100 });
}
