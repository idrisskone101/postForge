import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CAP = 400;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const slideshowDir = path.join(rootDir, "src/components/slideshow");

function countNewlines(filePath: string): number {
  let lines = 0;
  for (const byte of readFileSync(filePath)) {
    if (byte === 10) lines += 1;
  }
  return lines;
}

function listModules(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listModules(full, files);
      continue;
    }
    if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      files.push(full);
    }
  }
  return files;
}

const files = listModules(slideshowDir);
assert.ok(
  !existsSync(path.join(slideshowDir, "studio-views.tsx")),
  "studio-views.tsx must be split, not relocated",
);

const nestedBarrels = files.filter((file) => {
  const rel = path.relative(slideshowDir, file);
  return rel !== "index.ts" && (rel.endsWith("/index.ts") || rel.endsWith("/index.tsx"));
});
assert.deepEqual(nestedBarrels, [], "slideshow UI must not add nested barrels");

for (const file of files) {
  const rel = path.relative(rootDir, file);
  const lines = countNewlines(file);
  assert.ok(lines <= CAP, `${rel} is ${lines} lines (cap ${CAP})`);
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /import\(["']\.\/api["']\)/,
    `${rel} must not reintroduce import("./api")`,
  );
}

const creatorSource = readFileSync(path.join(slideshowDir, "creator-view.tsx"), "utf8");
assert.match(
  creatorSource,
  /import \{ requestSlideshowCreatorDerive \} from "@\/lib\/slideshow\/client"/,
);

const studioSource = readFileSync(path.join(slideshowDir, "slideshow-studio.tsx"), "utf8");
assert.match(studioSource, /fetchSlideshowProject\(item\.id/);

const draftsSource = readFileSync(path.join(slideshowDir, "drafts-view.tsx"), "utf8");
assert.match(draftsSource, /previewImageUrls/);
assert.doesNotMatch(draftsSource, /project\.slides\b/);

const publishSource = readFileSync(path.join(slideshowDir, "publish-dialog.tsx"), "utf8");
assert.match(publishSource, /destinationBlocked/);
assert.match(publishSource, /tiktokConnected/);
assert.match(publishSource, /publishingToTikTok && !tiktokConnected/);

console.log("slideshow studio UI split tests passed");
