import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const workflow = readFileSync(
  path.join(repoRoot, ".github/workflows/kode.yml"),
  "utf8"
);

assert.match(workflow, /^  kode:$/m);
assert.match(workflow, /pnpm kode:check/);
assert.match(workflow, /fetch-depth:\s*0/);
assert.match(workflow, /KODE_BASE_REF/);
assert.doesNotMatch(workflow, /^  merge:$/m);
assert.doesNotMatch(workflow, /gh pr merge/);
assert.doesNotMatch(workflow, /--squash/);
