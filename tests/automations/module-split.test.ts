import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CAP = 400;
const repoRoot = new URL("../../", import.meta.url);

function listFiles(relativeDir: string, files: string[] = []) {
  const dir = new URL(relativeDir, repoRoot);
  for (const entry of readdirSync(dir)) {
    if (entry === "new") continue;
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

const files = listFiles("src/app/automations/");

assert.equal(
  files.some((file) => file.endsWith("/index.ts") || file.endsWith("/index.tsx")),
  false,
  "automations hub must not add a barrel"
);

for (const file of files) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

assert.ok(
  lineCount("src/app/automations/automations-page-client.tsx") < 2030,
  "automations-page-client.tsx must shrink"
);

assert.ok(
  files.includes("src/app/automations/video-automation-list.tsx"),
  "JSON video automations stay a separate list"
);
assert.ok(
  files.includes("src/app/automations/slideshow-automation-list.tsx"),
  "Prisma slideshow automations stay a separate list"
);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
