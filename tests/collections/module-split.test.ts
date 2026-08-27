import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const CAP = 400;
const repoRoot = new URL("../../", import.meta.url);

function lineCount(relativePath: string) {
  const text = readFileSync(new URL(relativePath, repoRoot), "utf8");
  if (text.length === 0) return 0;
  return text.endsWith("\n")
    ? text.slice(0, -1).split("\n").length
    : text.split("\n").length;
}

function collectCollectionsRouteFiles(): string[] {
  const collectionsDir = new URL("src/app/(app)/collections/", repoRoot);
  const files: string[] = [];
  const visit = (dirUrl: URL, prefix: string) => {
    for (const entry of readdirSync(dirUrl, { withFileTypes: true })) {
      const rel = `${prefix}${entry.name}`;
      if (entry.isDirectory()) {
        visit(new URL(`${rel}/`, repoRoot), `${rel}/`);
        continue;
      }
      if (entry.isFile() && (rel.endsWith(".ts") || rel.endsWith(".tsx"))) {
        files.push(rel);
      }
    }
  };
  visit(collectionsDir, "src/app/(app)/collections/");
  return files.sort();
}

const files = collectCollectionsRouteFiles();

for (const file of files) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

assert.ok(
  lineCount("src/app/(app)/collections/collections-page-client.tsx") < 239,
  "collections-page-client.tsx must shrink below 239 lines"
);

const collectionsTsxFiles = files.filter((file) => file.endsWith(".tsx"));
for (const file of collectionsTsxFiles) {
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  assert.doesNotMatch(source, /export type /, `${file} must not export types`);
  assert.doesNotMatch(source, /pf-masthead/, `${file} must not use pf-masthead`);
  assert.doesNotMatch(source, /#(?:[0-9A-Fa-f]{3,8})\b/, `${file} must not use literal hex`);
}

assert.equal(
  existsSync(new URL("src/app/(app)/collections/types.ts", repoRoot)),
  true,
  "collections/types.ts must exist"
);

const collectionsPage = readFileSync(
  new URL("src/app/(app)/collections/page.tsx", repoRoot),
  "utf8"
);
assert.match(collectionsPage, /COLLECTIONS_HAIRLINE_CSS/);

const collectionsPanel = readFileSync(
  new URL("src/app/(app)/collections/collections-panel.tsx", repoRoot),
  "utf8"
);
assert.match(collectionsPanel, /\[data-collections-dropzone="true"\]/);
assert.match(collectionsPanel, /\[data-collections-selection-bar="true"\]/);

const firstPaint = readFileSync(new URL("src/app/first-paint-css.ts", repoRoot), "utf8");
assert.doesNotMatch(firstPaint, /\[data-collections-dropzone="true"\]/);
assert.doesNotMatch(firstPaint, /\[data-collections-selection-bar="true"\]/);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
