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
  ...listFiles("src/app/(app)/performance/"),
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
  !existsSync(new URL("src/app/(app)/performance/index.ts", repoRoot)),
  "src/app/(app)/performance must not grow an index barrel"
);
assert.ok(
  existsSync(new URL("src/app/(app)/performance/types.ts", repoRoot)),
  "performance/types.ts must exist"
);

const typesSource = readFileSync(
  new URL("src/app/(app)/performance/types.ts", repoRoot),
  "utf8"
);
const panelSource = readFileSync(
  new URL("src/app/(app)/performance/performance-source-panel.tsx", repoRoot),
  "utf8"
);
const pageSource = readFileSync(
  new URL("src/app/(app)/performance/performance-page-client.tsx", repoRoot),
  "utf8"
);
const hookSource = readFileSync(
  new URL("src/app/(app)/performance/use-performance-workspace.ts", repoRoot),
  "utf8"
);
const allowlist = JSON.parse(
  readFileSync(new URL("scripts/module-size-allowlist.json", repoRoot), "utf8")
) as Record<string, number>;

assert.deepEqual(allowlist, {}, "module-size allowlist stays empty");

assert.match(typesSource, /export type PerformanceSourceWorkspace = \{/);
assert.match(typesSource, /csvDataset: PerformanceDataset \| null/);
assert.match(typesSource, /providers: ConnectedAccountView\[\]/);
assert.match(
  panelSource,
  /import type \{ PerformanceSourceWorkspace \} from "\.\/types"/
);
assert.doesNotMatch(panelSource, /export type /);
assert.match(
  pageSource,
  /const sourceWorkspace: PerformanceSourceWorkspace = \{/
);
assert.match(
  pageSource,
  /<PerformanceSourcePanel workspace=\{sourceWorkspace\}/
);
assert.match(pageSource, /hidden overflow-x-auto sm:block/);
assert.doesNotMatch(
  hookSource,
  /PerformanceSourceWorkspace/,
  "page owner builds the view-model, not the workspace hook"
);

const performanceTsx = files.filter(
  (file) => file.startsWith("src/app/(app)/performance/") && file.endsWith(".tsx")
);
for (const file of performanceTsx) {
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  assert.doesNotMatch(source, /export type /, `${file} must not export types`);
  assert.doesNotMatch(source, /#(?:[0-9A-Fa-f]{3,8})\b/, `${file} must not use literal hex`);
}

function listedProps(source: string, exportName: string): string[] {
  const needle = `export function ${exportName}({`;
  const start = source.indexOf(needle);
  assert.notEqual(start, -1, exportName);
  const bodyStart = start + needle.length;
  const bodyEnd = source.indexOf("}", bodyStart);
  return source
    .slice(bodyStart, bodyEnd)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

const panelProps = listedProps(panelSource, "PerformanceSourcePanel");
assert.deepEqual(panelProps, ["workspace"]);
assert.ok(
  panelProps.length <= 3,
  "PerformanceSourcePanel takes a named view-model plus at most two extras"
);

assert.doesNotMatch(panelSource, /createContext|useContext/);
assert.doesNotMatch(pageSource, /createContext|useContext/);
assert.doesNotMatch(panelSource, /demo account|synthetic metric/i);
assert.match(panelSource, /optgroup label="Local reports"/);
assert.match(panelSource, /value="csv"/);
assert.match(panelSource, /csvDataset \?/);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
