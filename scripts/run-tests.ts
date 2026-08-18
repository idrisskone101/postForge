import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const defaultTarget = path.join(repoRoot, "tests");
const targetArg = process.argv[2];
const targetDir = targetArg
  ? path.resolve(repoRoot, targetArg)
  : defaultTarget;

function collectTestFiles(dir: string): string[] {
  const entries = readdirSync(dir).sort();
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }

    if (/\.test\.tsx?$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

const testFiles = collectTestFiles(targetDir);

if (testFiles.length === 0) {
  console.error(`No test files found under ${targetDir}`);
  process.exit(1);
}

for (const file of testFiles) {
  const relativePath = path.relative(repoRoot, file);
  console.log(`\n==> ${relativePath}`);

  const result = spawnSync("node", ["--import", "tsx", file], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\nPassed ${testFiles.length} test file(s).`);
