import assert from "node:assert/strict";
import { resolveApiUrl } from "../../src/lib/api/client";

const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const originalWindow = (globalThis as { window?: unknown }).window;

process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

delete (globalThis as { window?: unknown }).window;
assert.equal(
  resolveApiUrl("/api/avatars"),
  "http://localhost:3000/api/avatars"
);

(globalThis as { window?: unknown }).window = {};
assert.equal(resolveApiUrl("/api/avatars"), "/api/avatars");

if (originalBaseUrl === undefined) {
  delete process.env.NEXT_PUBLIC_BASE_URL;
} else {
  process.env.NEXT_PUBLIC_BASE_URL = originalBaseUrl;
}

if (originalWindow === undefined) {
  delete (globalThis as { window?: unknown }).window;
} else {
  (globalThis as { window?: unknown }).window = originalWindow;
}
