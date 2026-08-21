import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkModuleSize,
  MODULE_SIZE_CAP,
} from "../../scripts/check-module-size";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function withTempRoot(run: (rootDir: string) => void): void {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), "module-size-"));
  try {
    run(rootDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

function writeModule(rootDir: string, relPath: string, lines: number): void {
  const absPath = path.join(rootDir, relPath);
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, "x\n".repeat(lines));
}

withTempRoot((rootDir) => {
  writeModule(rootDir, "src/new-file.tsx", MODULE_SIZE_CAP + 1);
  const violations = checkModuleSize({ rootDir, allowlist: {} });
  assert.deepEqual(violations, [
    { kind: "over-cap", path: "src/new-file.tsx", lines: MODULE_SIZE_CAP + 1 },
  ]);
});

withTempRoot((rootDir) => {
  writeModule(rootDir, "src/big.ts", 420);
  const violations = checkModuleSize({
    rootDir,
    allowlist: { "src/big.ts": 410 },
  });
  assert.deepEqual(violations, [
    { kind: "grew", path: "src/big.ts", lines: 420, allowed: 410 },
  ]);
});

withTempRoot((rootDir) => {
  writeModule(rootDir, "src/ok.ts", 10);
  const violations = checkModuleSize({
    rootDir,
    allowlist: { "src/gone.ts": 401 },
  });
  assert.deepEqual(violations, [
    { kind: "missing", path: "src/gone.ts", allowed: 401 },
  ]);
});

withTempRoot((rootDir) => {
  writeModule(rootDir, "src/was-big.ts", MODULE_SIZE_CAP);
  const violations = checkModuleSize({
    rootDir,
    allowlist: { "src/was-big.ts": 500 },
  });
  assert.deepEqual(violations, [
    {
      kind: "stale",
      path: "src/was-big.ts",
      lines: MODULE_SIZE_CAP,
      allowed: 500,
    },
  ]);
});

withTempRoot((rootDir) => {
  writeModule(rootDir, "src/frozen.ts", 410);
  writeModule(rootDir, "src/ok.ts", MODULE_SIZE_CAP);
  writeModule(rootDir, "src/generated/huge.ts", 500);
  writeFileSync(
    path.join(rootDir, "src", "unterminated.ts"),
    "x\n".repeat(MODULE_SIZE_CAP) + "x"
  );
  const violations = checkModuleSize({
    rootDir,
    allowlist: { "src/frozen.ts": 410 },
  });
  assert.deepEqual(violations, []);
});

withTempRoot((rootDir) => {
  writeModule(rootDir, "src/shrinking.ts", 420);
  const violations = checkModuleSize({
    rootDir,
    allowlist: { "src/shrinking.ts": 450 },
  });
  assert.deepEqual(violations, []);
});

const allowlist = JSON.parse(
  readFileSync(path.join(repoRoot, "scripts", "module-size-allowlist.json"), "utf8")
) as Record<string, number>;
const repoViolations = checkModuleSize({ rootDir: repoRoot, allowlist });
assert.deepEqual(repoViolations, []);
