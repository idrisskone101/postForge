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
  checkDesignTokens,
  DESIGN_MD_EXCEPTION_PATHS,
  findForbiddenHex,
  formatDesignTokenViolations,
} from "../../scripts/check-design-tokens";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function withTempRoot(run: (rootDir: string) => void): void {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), "design-tokens-"));
  try {
    run(rootDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

function writeModule(rootDir: string, relPath: string, source: string): void {
  const absPath = path.join(rootDir, relPath);
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, source);
}

assert.deepEqual(findForbiddenHex('className="bg-[#09090B]"'), []);
assert.deepEqual(findForbiddenHex('className="bg-[#09090b]"'), []);
assert.deepEqual(findForbiddenHex('className="bg-[#FF4A20]"'), ["#FF4A20"]);
assert.deepEqual(findForbiddenHex("stroke='#fff' color='#111111'"), [
  "#fff",
  "#111111",
]);

withTempRoot((rootDir) => {
  writeModule(
    rootDir,
    "src/new-file.tsx",
    `export function Card() { return <div className="bg-[#ff0000]" />; }\n`
  );
  const violations = checkDesignTokens({ rootDir, allowlist: {} });
  assert.deepEqual(violations, [
    { kind: "over-cap", path: "src/new-file.tsx", count: 1 },
  ]);
});

withTempRoot((rootDir) => {
  writeModule(
    rootDir,
    "src/debt.tsx",
    `export const a = "#111111";\nexport const b = "#ffffff";\nexport const c = "#ff0000";\n`
  );
  const violations = checkDesignTokens({
    rootDir,
    allowlist: { "src/debt.tsx": 2 },
  });
  assert.deepEqual(violations, [
    { kind: "grew", path: "src/debt.tsx", count: 3, allowed: 2 },
  ]);
});

withTempRoot((rootDir) => {
  writeModule(rootDir, "src/ok.ts", "export const n = 1;\n");
  const violations = checkDesignTokens({
    rootDir,
    allowlist: { "src/gone.ts": 1 },
  });
  assert.deepEqual(violations, [
    { kind: "missing", path: "src/gone.ts", allowed: 1 },
  ]);
});

withTempRoot((rootDir) => {
  writeModule(
    rootDir,
    "src/was-hex.tsx",
    `export function Card() { return <div className="bg-background" />; }\n`
  );
  const violations = checkDesignTokens({
    rootDir,
    allowlist: { "src/was-hex.tsx": 2 },
  });
  assert.deepEqual(violations, [
    { kind: "stale", path: "src/was-hex.tsx", count: 0, allowed: 2 },
  ]);
});

withTempRoot((rootDir) => {
  writeModule(
    rootDir,
    "src/frozen.tsx",
    `export const a = "#111111";\nexport const b = "#ffffff";\n`
  );
  writeModule(
    rootDir,
    "src/ok.tsx",
    `export function Stage() { return <div className="bg-[#09090B]" />; }\n`
  );
  writeModule(
    rootDir,
    "src/generated/dump.ts",
    `export const css = "#ff0000";\n`
  );
  writeModule(
    rootDir,
    "src/components/ui/button.tsx",
    `export function Button() { return <button className="bg-[#ccc]" />; }\n`
  );
  writeModule(
    rootDir,
    "src/app/first-paint-css.ts",
    "export const FIRST_PAINT_CSS = `body{color:#18181b}`;\n"
  );
  writeModule(
    rootDir,
    "src/app/(app)/automations/new/playbook-model.ts",
    `export const TEMPLATE_VISUALS = { custom: "bg-[#E5E6DF]" };\n`
  );
  const violations = checkDesignTokens({
    rootDir,
    allowlist: { "src/frozen.tsx": 2 },
  });
  assert.deepEqual(violations, []);
});

withTempRoot((rootDir) => {
  writeModule(
    rootDir,
    "src/shrinking.tsx",
    `export const a = "#111111";\n`
  );
  const violations = checkDesignTokens({
    rootDir,
    allowlist: { "src/shrinking.tsx": 3 },
  });
  assert.deepEqual(violations, []);
});

assert.match(
  formatDesignTokenViolations([
    { kind: "over-cap", path: "src/new.tsx", count: 1 },
  ]),
  /src\/new\.tsx/
);

assert.equal(
  DESIGN_MD_EXCEPTION_PATHS.has(
    "src/app/(app)/automations/new/playbook-model.ts"
  ),
  true
);

const allowlist = JSON.parse(
  readFileSync(
    path.join(repoRoot, "scripts", "design-token-allowlist.json"),
    "utf8"
  )
) as Record<string, number>;
const repoViolations = checkDesignTokens({ rootDir: repoRoot, allowlist });
assert.deepEqual(repoViolations, []);
