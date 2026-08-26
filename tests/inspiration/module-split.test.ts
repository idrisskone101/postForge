import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const CAP = 400;
const repoRoot = new URL("../../", import.meta.url);
const MEDIA_STAGE = "#09090B";
const MEDIA_STAGE_FILES = new Set([
  "src/app/(app)/ugc-inspiration/inspiration-preview-dialog.tsx",
  "src/app/(app)/ugc-inspiration/inspiration-video-card.tsx",
]);

function lineCount(relativePath: string) {
  const text = readFileSync(new URL(relativePath, repoRoot), "utf8");
  if (text.length === 0) return 0;
  return text.endsWith("\n")
    ? text.slice(0, -1).split("\n").length
    : text.split("\n").length;
}

function collectInspirationRouteFiles(): string[] {
  const dir = new URL("src/app/(app)/ugc-inspiration/", repoRoot);
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
  visit(dir, "src/app/(app)/ugc-inspiration/");
  return files.sort();
}

const files = collectInspirationRouteFiles();

for (const file of files) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

const inspirationTsxFiles = files.filter((file) => file.endsWith(".tsx"));
for (const file of inspirationTsxFiles) {
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  assert.doesNotMatch(source, /export type /, `${file} must not export types`);
  assert.doesNotMatch(source, /data-lcp/, `${file} must not use data-lcp after hydrate`);
  assert.doesNotMatch(source, /pf-masthead/, `${file} must not use pf-masthead`);
  assert.doesNotMatch(source, /pf-tear/, `${file} must not use pf-tear`);
  const hexMatches = source.match(/#(?:[0-9A-Fa-f]{3,8})\b/g) ?? [];
  if (MEDIA_STAGE_FILES.has(file)) {
    assert.ok(
      hexMatches.every((value) => value === MEDIA_STAGE),
      `${file} may only use ${MEDIA_STAGE} for the media stage`
    );
  } else {
    assert.equal(hexMatches.length, 0, `${file} must not use literal hex`);
  }
}

const client = readFileSync(
  new URL("src/app/(app)/ugc-inspiration/inspiration-page-client.tsx", repoRoot),
  "utf8"
);
assert.match(client, /pf-card/);
assert.match(client, /pf-button-secondary/);
assert.doesNotMatch(client, /hover:text-\[var\(--pf-orange\)\]/);
assert.doesNotMatch(client, /data-bulk/i);
assert.doesNotMatch(client, /type="checkbox"/i);

assert.equal(
  existsSync(new URL("src/app/(app)/ugc-inspiration/types.ts", repoRoot)),
  true,
  "ugc-inspiration/types.ts must exist"
);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
