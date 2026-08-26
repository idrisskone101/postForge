import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const CAP = 400;
const repoRoot = new URL("../../", import.meta.url);
const MEDIA_STAGE = "#09090B";
const MEDIA_STAGE_FILES = new Set([
  "src/app/(app)/generate/[id]/page.tsx",
  "src/components/generation-form.tsx",
]);

function lineCount(relativePath: string) {
  const text = readFileSync(new URL(relativePath, repoRoot), "utf8");
  if (text.length === 0) return 0;
  return text.endsWith("\n")
    ? text.slice(0, -1).split("\n").length
    : text.split("\n").length;
}

function collectGenerateRouteFiles(): string[] {
  const generateDir = new URL("src/app/(app)/generate/", repoRoot);
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
  visit(generateDir, "src/app/(app)/generate/");
  return files.sort();
}

const files = collectGenerateRouteFiles();

for (const file of files) {
  const count = lineCount(file);
  assert.ok(count <= CAP, `${file} is ${count} lines (cap ${CAP})`);
}

const generateTsxFiles = files.filter((file) => file.endsWith(".tsx"));
for (const file of generateTsxFiles) {
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  assert.doesNotMatch(source, /export type /, `${file} must not export types`);
  assert.doesNotMatch(source, /pf-masthead/, `${file} must not use pf-masthead`);

  const hexMatches = source.match(/#(?:[0-9A-Fa-f]{3,8})\b/g) ?? [];
  if (MEDIA_STAGE_FILES.has(file)) {
    assert.ok(
      hexMatches.every((value) => value === MEDIA_STAGE),
      `${file} may only use ${MEDIA_STAGE} for the media stage`
    );
  } else {
    assert.equal(hexMatches.length, 0, `${file} must not use literal hex`);
  }

  if (file.endsWith("generate-paint-text.tsx")) {
    continue;
  }

  assert.doesNotMatch(
    source,
    /(?<![\w-])(?<![\w]+:)hidden\b/,
    `${file} must not use bare hidden class`
  );
}

for (const file of MEDIA_STAGE_FILES) {
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  const hexMatches = source.match(/#(?:[0-9A-Fa-f]{3,8})\b/g) ?? [];
  assert.ok(
    hexMatches.every((value) => value === MEDIA_STAGE),
    `${file} may only use ${MEDIA_STAGE} for the media stage`
  );
  assert.match(source, /bg-\[#09090B\]/, `${file} must keep the media stage bed`);
}

assert.equal(
  existsSync(new URL("src/app/(app)/generate/generate-paint-text.tsx", repoRoot)),
  true,
  "generate-paint-text.tsx must exist"
);

const chromeSource = [
  "form-controls.tsx",
  "form-prompt-section.tsx",
  "form-format-section.tsx",
  "generate-header-accessory.tsx",
  "job-inspector.tsx",
]
  .map((file) =>
    readFileSync(new URL(`src/app/(app)/generate/${file}`, repoRoot), "utf8")
  )
  .join("\n");

assert.match(chromeSource, /GeneratePaintText/);
assert.match(chromeSource, /paintReady \? undefined/);

const formChrome = [
  "form-controls.tsx",
  "form-prompt-section.tsx",
  "form-collection-section.tsx",
  "form-identity-section.tsx",
  "form-submit-bars.tsx",
  "generate-header-accessory.tsx",
]
  .map((file) =>
    readFileSync(new URL(`src/app/(app)/generate/${file}`, repoRoot), "utf8")
  )
  .join("\n");

assert.match(formChrome, /pf-card/);
assert.match(formChrome, /pf-button-primary/);
assert.match(formChrome, /pf-section-title/);

assert.equal(
  existsSync(new URL("src/app/(app)/generate/form-types.ts", repoRoot)),
  true,
  "form-types.ts must exist"
);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
