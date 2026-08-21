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

const files = listFiles("src/app/settings/");

assert.ok(
  !files.some((file) => file.endsWith("/index.ts") || file.endsWith("/index.tsx")),
  "settings must not add a pass-through barrel"
);

for (const file of files) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

assert.ok(
  lineCount("src/app/settings/settings-page-client.tsx") < 1420,
  "settings-page-client.tsx must shrink"
);

const pageSource = readFileSync(
  new URL("src/app/settings/settings-page-client.tsx", repoRoot),
  "utf8"
);
assert.doesNotMatch(
  pageSource,
  /^export \{/m,
  "settings-page-client must not re-export extracted modules"
);
assert.match(pageSource, /lg:grid-cols-\[210px_minmax\(0,1fr\)\]/);
assert.match(pageSource, /overflow-x-auto overscroll-x-contain/);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
