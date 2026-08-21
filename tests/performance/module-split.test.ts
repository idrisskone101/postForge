import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CAP = 400;
const repoRoot = new URL("../../", import.meta.url);

function listFiles(relativeDir: string, files: string[] = []) {
  const dir = new URL(relativeDir, repoRoot);
  for (const entry of readdirSync(dir)) {
    const relative = `${relativeDir}${entry}`;
    const full = join(dir.pathname, entry);
    if (statSync(full).isDirectory()) {
      listFiles(`${relative}/`, files);
      continue;
    }
    if (entry.endsWith(".ts") || entry.endsWith(".tsx")) files.push(relative);
  }
  return files;
}

function lineCount(relativePath: string) {
  const text = readFileSync(new URL(relativePath, repoRoot), "utf8");
  if (text.length === 0) return 0;
  return text.endsWith("\n")
    ? text.slice(0, -1).split("\n").length
    : text.split("\n").length;
}

const files = [
  ...listFiles("src/app/performance/"),
  ...listFiles("src/lib/performance/"),
];

for (const file of files) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

assert.ok(
  !existsSync(new URL("src/lib/performance/index.ts", repoRoot)),
  "src/lib/performance must not grow an index barrel"
);
assert.ok(
  !existsSync(new URL("src/app/performance/index.ts", repoRoot)),
  "src/app/performance must not grow an index barrel"
);
assert.ok(
  lineCount("src/app/performance/performance-page-client.tsx") < 1033,
  "performance-page-client.tsx must shrink"
);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
