import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const config = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../../eslint.config.mjs"),
  "utf8"
);

assert.match(config, /files:\s*\["src\/\*\*\/\*\.tsx"\]/);
assert.match(config, /"no-nested-ternary":\s*"warn"/);
assert.doesNotMatch(config, /max-len/);
assert.doesNotMatch(config, /no-ternary/);
