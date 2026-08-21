import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CAP = 400;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const componentsDir = path.join(repoRoot, "src/components");

const dialogModules = [
  "pinterest-import-workspace.tsx",
  "pinterest-import-dialog.tsx",
  "pinterest-import-search.tsx",
  "pinterest-import-results.tsx",
  "pinterest-import-footer.tsx",
] as const;

const sectionExports = [
  ["pinterest-import-search.tsx", "PinterestImportSearch"],
  ["pinterest-import-results.tsx", "PinterestImportResults"],
  ["pinterest-import-footer.tsx", "PinterestImportFooter"],
] as const;

function lineCount(absPath: string) {
  const text = readFileSync(absPath, "utf8");
  if (text.length === 0) return 0;
  return text.endsWith("\n")
    ? text.slice(0, -1).split("\n").length
    : text.split("\n").length;
}

function readComponent(file: (typeof dialogModules)[number]) {
  return readFileSync(path.join(componentsDir, file), "utf8");
}

function exportedDestructuredProps(source: string, name: string) {
  const marker = `export function ${name}({`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} is not exported`);
  const rest = source.slice(start + marker.length);
  const end = rest.indexOf("}:");
  assert.ok(end >= 0, `${name} does not use an inline props type`);
  return rest
    .slice(0, end)
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => part.split(":")[0]!.trim());
}

for (const file of dialogModules) {
  const absPath = path.join(componentsDir, file);
  const count = lineCount(absPath);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

assert.ok(
  !existsSync(path.join(componentsDir, "pinterest/index.ts")),
  "src/components/pinterest must not grow an index barrel",
);
assert.ok(
  !existsSync(path.join(componentsDir, "index.ts")),
  "src/components must not grow an index barrel",
);

const dialogSource = readComponent("pinterest-import-dialog.tsx");
const searchSource = readComponent("pinterest-import-search.tsx");
const workspaceSource = readComponent("pinterest-import-workspace.tsx");
const combinedSource = dialogModules.map(readComponent).join("\n");

assert.match(workspaceSource, /export type PinterestImportWorkspace/);
assert.match(workspaceSource, /PinterestCandidateSource/);
assert.doesNotMatch(workspaceSource, /createContext/);

for (const [file, name] of sectionExports) {
  const source = readComponent(file);
  const props = exportedDestructuredProps(source, name);
  assert.deepEqual(
    props.filter((prop) => prop === "workspace"),
    ["workspace"],
    `${name} must take a workspace view-model`,
  );
  assert.ok(
    props.length <= 3,
    `${name} takes ${props.join(", ")} (${props.length} props; max is workspace plus two extras)`,
  );
  assert.match(source, /workspace: PinterestImportWorkspace/);
  assert.doesNotMatch(source, /createContext/);
}

assert.match(
  dialogSource,
  /from "@\/lib\/collections-client"/,
);
assert.match(dialogSource, /fetchPinterestCandidates\(/);
assert.match(dialogSource, /importPinterestImages\(/);
assert.match(dialogSource, /importedSelection/);
assert.match(dialogSource, /idempotencyKey/);
assert.match(dialogSource, /loadingMore/);
assert.match(dialogSource, /MAX_PINTEREST_IMPORT_IMAGES/);
assert.match(dialogSource, /<PinterestImportSearch workspace=\{workspace\} \/>/);
assert.match(dialogSource, /<PinterestImportResults workspace=\{workspace\} \/>/);
assert.match(dialogSource, /<PinterestImportFooter workspace=\{workspace\} \/>/);
assert.doesNotMatch(dialogSource, /demo board/i);
assert.doesNotMatch(dialogSource, /fakeCandidates|mockCandidates|DEMO_BOARDS/);
assert.doesNotMatch(
  dialogSource,
  /https:\/\/(www\.)?pinterest\.com\/[^"'`\s]+/,
);
assert.doesNotMatch(dialogSource, /createContext/);

assert.match(searchSource, /"clean desk"/);
assert.match(searchSource, /"https:\/\/pinterest\.com\/creator\/board"/);
assert.doesNotMatch(searchSource, /demo board/i);

assert.match(combinedSource, /Use .* as slide image/);
assert.match(combinedSource, /Create style JSON from/);
assert.match(combinedSource, /Load more/);
assert.match(combinedSource, /\.slice\(0, MAX_PINTEREST_IMPORT_IMAGES\)/);
assert.doesNotMatch(combinedSource, /fakeCandidates|mockCandidates|DEMO_BOARDS/);

const clientSource = readFileSync(
  path.join(repoRoot, "src/lib/collections-client.ts"),
  "utf8",
);
assert.match(
  clientSource,
  /\/api\/collection-assets\/pinterest\/candidates/,
);

console.log("pinterest import dialog split tests passed");
