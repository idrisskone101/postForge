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

const files = listFiles("src/app/(app)/automations/");

assert.equal(
  files.some((file) => file.endsWith("/index.ts") || file.endsWith("/index.tsx")),
  false,
  "automations hub and builder must not add a barrel"
);

for (const file of files) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

assert.ok(
  lineCount("src/app/(app)/automations/automations-page-client.tsx") < 2030,
  "automations-page-client.tsx must shrink"
);
assert.ok(
  lineCount("src/app/(app)/automations/new/automation-builder-client.tsx") < 1372,
  "automation-builder-client.tsx must shrink"
);
assert.ok(
  lineCount("src/app/(app)/automations/new/slideshow-automation-builder.tsx") <= CAP,
  "slideshow-automation-builder.tsx must stay under the cap"
);

assert.ok(
  files.includes("src/app/(app)/automations/video-automation-list.tsx"),
  "JSON video automations stay a separate list"
);
assert.ok(
  files.includes("src/app/(app)/automations/slideshow-automation-list.tsx"),
  "Prisma slideshow automations stay a separate list"
);
assert.ok(
  files.includes("src/app/(app)/automations/new/automation-builder-client.tsx"),
  "JSON video automations keep their builder"
);
assert.ok(
  files.includes("src/app/(app)/automations/new/slideshow-automation-builder.tsx"),
  "Prisma slideshow automations keep a separate builder"
);

const clientSource = readFileSync(
  new URL("src/app/(app)/automations/new/automation-builder-client.tsx", repoRoot),
  "utf8"
);
assert.doesNotMatch(
  clientSource,
  /^export \{/m,
  "automation-builder-client must not re-export extracted modules"
);
assert.match(clientSource, /h-full[^"\n]*max-h-\[860px\][^"\n]*overflow-hidden/);
assert.match(clientSource, /pf-safe-overlay/);
assert.match(
  clientSource,
  /pf-safe-overlay[^"\n]*[\s\S]*?max-h-full[^"\n]*overflow-y-auto/
);
assert.match(
  clientSource,
  /pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\]/
);
assert.match(clientSource, /<PlaybookPicker picker=\{playbookPicker\} \/>/);
assert.doesNotMatch(
  clientSource,
  /createContext/,
  "builder client must not hide picker props behind React Context"
);

const PROP_BAG_LIMIT = 7;

function exportedComponentPropCount(source: string, exportName: string) {
  const start = source.indexOf(`export function ${exportName}(`);
  assert.ok(start >= 0, `missing export function ${exportName}`);
  const rest = source.slice(start + `export function ${exportName}(`.length);
  if (rest.startsWith(")")) return 0;
  assert.equal(rest[0], "{", `${exportName} must take a destructured props object`);
  const close = rest.indexOf("}:");
  assert.ok(close >= 0, `${exportName} props object must use an inline type`);
  return rest
    .slice(1, close)
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0).length;
}

const builderDir = "src/app/(app)/automations/new/";
const namedComponents: Array<[string, string, number]> = [
  ["playbook-picker.tsx", "PlaybookPicker", 1],
  ["playbook-card.tsx", "PlaybookCard", 2],
  ["destination-selector.tsx", "DestinationSelector", 1],
  ["automation-builder-phase-form.tsx", "AutomationBuilderPhaseForm", 1],
  ["automation-builder-preview-pane.tsx", "AutomationBuilderPreviewPane", 1],
  ["automation-builder-client.tsx", "AutomationBuilderClient", 1],
  ["slideshow-automation-builder.tsx", "SlideshowAutomationBuilder", 1],
];
for (const [file, exportName, expected] of namedComponents) {
  const source = readFileSync(new URL(`${builderDir}${file}`, repoRoot), "utf8");
  const count = exportedComponentPropCount(source, exportName);
  assert.equal(count, expected, `${exportName} takes ${count} props`);
  assert.ok(
    count <= PROP_BAG_LIMIT,
    `${exportName} is a ${count}-field prop bag (limit ${PROP_BAG_LIMIT})`
  );
}

const pickerModel = readFileSync(
  new URL("src/app/(app)/automations/new/playbook-model.ts", repoRoot),
  "utf8"
);
assert.match(pickerModel, /export type PlaybookPickerState/);
const destinationSource = readFileSync(
  new URL("src/app/(app)/automations/new/destination-selector.tsx", repoRoot),
  "utf8"
);
assert.match(destinationSource, /export type DestinationSelectorState/);
assert.match(destinationSource, /selector: DestinationSelectorState/);

for (const file of files.filter((path) => path.startsWith("src/app/(app)/automations/new/"))) {
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  assert.doesNotMatch(source, /createContext/, `${file} must not add React Context`);
  for (const match of source.matchAll(/export function ([A-Z][A-Za-z0-9]*)\(/g)) {
    const exportName = match[1];
    const count = exportedComponentPropCount(source, exportName);
    assert.ok(
      count <= PROP_BAG_LIMIT,
      `${file} ${exportName} is a ${count}-field prop bag (limit ${PROP_BAG_LIMIT})`
    );
  }
}

const libFiles = listFiles("src/lib/automations/");
assert.equal(
  libFiles.some((file) => file.endsWith("/index.ts") || file.endsWith("/index.tsx")),
  false,
  "src/lib/automations must not add a barrel"
);
for (const file of libFiles) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

const namedLibFiles = [
  "src/lib/automations.ts",
  "src/lib/automation-publishing.ts",
  "src/lib/automation-publish-orchestration.ts",
];
for (const file of namedLibFiles) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  assert.match(
    source,
    /^export (async )?function /m,
    `${file} must keep an implementation, not become a re-export barrel`
  );
}

console.log(
  [...files, ...libFiles, ...namedLibFiles]
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
