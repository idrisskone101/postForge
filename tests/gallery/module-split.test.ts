import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
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
  "src/components/gallery-grid.tsx",
  ...listFiles("src/components/gallery/"),
  ...listFiles("src/app/(app)/gallery/"),
];

for (const file of files) {
  const count = lineCount(file);
  assert.ok(
    count <= CAP,
    `${file} is ${count} lines (cap ${CAP})`
  );
}

assert.ok(
  lineCount("src/components/gallery-grid.tsx") < 1301,
  "gallery-grid.tsx must shrink"
);
assert.ok(
  lineCount("src/app/(app)/gallery/gallery-page-client.tsx") < 933,
  "gallery-page-client.tsx must shrink"
);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
