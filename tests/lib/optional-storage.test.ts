import assert from "node:assert/strict";
import {
  readOptionalStorage,
  writeOptionalStorage,
} from "../../src/lib/optional-storage";

const store = new Map<string, string>();

Object.defineProperty(globalThis, "window", {
  value: {
    localStorage: {
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
    },
  },
  configurable: true,
});

writeOptionalStorage("budget", "250");
assert.equal(readOptionalStorage("budget"), "250");
assert.equal(readOptionalStorage("missing"), null);

Object.defineProperty(globalThis, "window", {
  value: {
    localStorage: {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    },
  },
  configurable: true,
});

assert.equal(readOptionalStorage("budget"), null);
writeOptionalStorage("budget", "400");
