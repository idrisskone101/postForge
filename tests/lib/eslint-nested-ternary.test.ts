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

assert.match(config, /createJiti/);
assert.match(config, /eslint-plugin-kode-taste/);
assert.match(config, /files:\s*\["src\/\*\*\/\*\.\{ts,tsx\}"\]/);
assert.match(config, /ignores:\s*\["src\/generated\/\*\*",\s*"src\/components\/ui\/\*\*"\]/);
for (const ruleId of [
  "kode-taste/file-layout",
  "kode-taste/prop-bags",
  "kode-taste/use-state",
  "kode-taste/use-effect",
  "kode-taste/inner-html",
  "kode-taste/hook-size",
  "kode-taste/effect-fns",
]) {
  assert.match(config, new RegExp(`"${ruleId.replace("/", "\\/")}":\\s*"error"`));
}
