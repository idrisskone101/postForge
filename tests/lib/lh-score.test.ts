import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../../scripts/lh-score.mjs"),
  "utf8"
);

assert.match(script, /--preset=desktop/);
assert.doesNotMatch(script, /screenEmulation\.mobile=\$\{formFactor === "mobile"\}/);
assert.match(script, /form-factor=mobile/);
