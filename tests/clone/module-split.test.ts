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
  if (file === "src/components/ugc-clone-form.tsx") continue;
  const count = lineCount(file);
  assert.ok(
    count <= CAP,
    `${file} is ${count} lines (cap ${CAP})`
  );
}

assert.ok(
  lineCount("src/components/ugc-clone-form.tsx") < 2663,
  "ugc-clone-form.tsx must shrink"
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

console.log(
  files
    .map((file) => `${lineCount(file).toString().padStart(4)} ${file}`)
    .join("\n")
);
