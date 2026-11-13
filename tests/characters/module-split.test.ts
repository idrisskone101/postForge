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

function collectCharactersRouteFiles(): string[] {
  const charactersDir = new URL("src/app/(app)/characters/", repoRoot);
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
  visit(charactersDir, "src/app/(app)/characters/");
  return files.sort();
}

const files = collectCharactersRouteFiles();

for (const file of files) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

assert.ok(
  lineCount("src/app/(app)/characters/characters-page-client.tsx") < 211,
  "characters-page-client.tsx must shrink below 211 lines"
);

const charactersTsxFiles = files.filter((file) => file.endsWith(".tsx"));
for (const file of charactersTsxFiles) {
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  assert.doesNotMatch(source, /export type /, `${file} must not export types`);
  assert.doesNotMatch(source, /pf-masthead/, `${file} must not use pf-masthead`);

  assert.doesNotMatch(source, /#(?:[0-9A-Fa-f]{3,8})\b/, `${file} must not use literal hex`);
}

assert.equal(
  existsSync(new URL("src/app/(app)/characters/types.ts", repoRoot)),
  true,
  "characters/types.ts must exist"
);
assert.equal(
  existsSync(new URL("src/app/(app)/characters/new/types.ts", repoRoot)),
  true,
  "characters/new/types.ts must exist"
);

const librarySource = [
  "characters-page-client.tsx",
  "characters-library.tsx",
  "characters-card.tsx",
  "characters-helpers.ts",
]
  .map((file) =>
    readFileSync(new URL(`src/app/(app)/characters/${file}`, repoRoot), "utf8")
  )
  .join("\n");

assert.doesNotMatch(librarySource, /data-bulk/);
assert.doesNotMatch(librarySource, /bulk-bar/i);

const emptySource = readFileSync(
  new URL("src/app/(app)/characters/characters-empty.tsx", repoRoot),
  "utf8"
);
assert.match(emptySource, /data-characters-empty/);
assert.match(emptySource, /<EmptyState icon="characters" title="No characters yet">/);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
