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
  "src/components/ugc-clone-form.tsx",
  "src/components/clone-output-review-detail.tsx",
  "src/components/video-trimmer.tsx",
  "src/components/tiktok-input.tsx",
  "src/lib/ugc/generate-clone.ts",
  ...listFiles("src/components/clone/"),
  ...listFiles("src/components/clone-output/"),
  ...listFiles("src/app/(app)/ugc-clone/"),
  "src/components/tiktok-saved-sources.tsx",
  "src/components/video-trim-range.ts",
  "src/components/video-trim-range-fields.tsx",
  "src/components/video-trim-timeline.tsx",
  "src/lib/ugc/clone-job-input.ts",
  "src/lib/ugc/clone-prompt.ts",
  "src/lib/ugc/clone-source-snapshot.ts",
];

assert.equal(
  files.some((file) => file.endsWith("/index.ts") || file.endsWith("/index.tsx")),
  false,
  "clone split must not add a barrel"
);

for (const file of files) {
  const count = lineCount(file);
  assert.ok(
    count <= CAP,
    `${file} is ${count} lines (cap ${CAP})`
  );
}

assert.ok(
  lineCount("src/components/ugc-clone-form.tsx") <= CAP,
  "ugc-clone-form.tsx must drop under cap"
);
assert.ok(
  lineCount("src/components/clone-output-review-detail.tsx") <= CAP,
  "clone-output-review-detail.tsx must drop under cap"
);
assert.ok(
  lineCount("src/components/video-trimmer.tsx") <= CAP,
  "video-trimmer.tsx must drop under cap"
);
assert.ok(
  lineCount("src/components/tiktok-input.tsx") <= CAP,
  "tiktok-input.tsx must drop under cap"
);
assert.ok(
  lineCount("src/lib/ugc/generate-clone.ts") <= CAP,
  "generate-clone.ts must drop under cap"
);

const cloneChromeFiles = [
  "src/app/(app)/ugc-clone/clone-owned-header.tsx",
  "src/app/(app)/ugc-clone/[id]/page.tsx",
  "src/components/ugc-clone-form.tsx",
  "src/components/ugc-clone-queue.tsx",
  "src/components/clone-output-review-detail.tsx",
  ...listFiles("src/components/clone/"),
  ...listFiles("src/components/clone-output/"),
];

for (const file of cloneChromeFiles) {
  if (!file.endsWith(".tsx")) continue;
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  const hexMatches = source.match(/#(?:[0-9A-Fa-f]{3,8})\b/g) ?? [];
  assert.equal(hexMatches.length, 0, `${file} must not use literal hex`);
}

const chromeSource = [
  "src/app/(app)/ugc-clone/clone-owned-header.tsx",
  "src/components/clone/action-bar.tsx",
  "src/components/clone/setup-nav.tsx",
  "src/components/clone/source-step.tsx",
  "src/components/clone-output/header.tsx",
]
  .map((file) => readFileSync(new URL(file, repoRoot), "utf8"))
  .join("\n");

assert.doesNotMatch(
  chromeSource,
  /pf-button-primary|pf-section-title|pf-card|data-clone-copy|data-home-title/
);
assert.match(chromeSource, /wb-step-rail/);

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
