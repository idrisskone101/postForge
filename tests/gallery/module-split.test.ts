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
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

assert.ok(
  lineCount("src/components/gallery-grid.tsx") < 1301,
  "gallery-grid.tsx must shrink"
);
assert.ok(
  lineCount("src/app/(app)/gallery/gallery-page-client.tsx") < 331,
  "gallery-page-client.tsx must shrink below 331 lines"
);
assert.ok(
  lineCount("src/app/(app)/gallery/gallery-first-paint.tsx") < 120,
  "gallery-first-paint.tsx stays a thin first-paint shell"
);

const galleryRouteTsx = listFiles("src/app/(app)/gallery/").filter((file) =>
  file.endsWith(".tsx")
);
const galleryComponentTsx = listFiles("src/components/gallery/").filter((file) =>
  file.endsWith(".tsx")
);

for (const file of [...galleryRouteTsx, ...galleryComponentTsx]) {
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  assert.doesNotMatch(source, /pf-tear/, `${file} must not use pf-tear`);
  assert.doesNotMatch(source, /pf-masthead/, `${file} must not use pf-masthead`);
  if (file !== "src/components/gallery/lightbox.tsx") {
    assert.doesNotMatch(
      source,
      /#(?:[0-9A-Fa-f]{3,8})\b/,
      `${file} must not use literal hex`
    );
  } else {
    const hexMatches = source.match(/#(?:[0-9A-Fa-f]{3,8})\b/g) ?? [];
    assert.deepEqual(
      hexMatches,
      ["#09090B"],
      "lightbox.tsx may only use #09090B for the media stage"
    );
  }
}

for (const file of galleryRouteTsx) {
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  assert.doesNotMatch(source, /export type /, `${file} must not export types`);
}

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
