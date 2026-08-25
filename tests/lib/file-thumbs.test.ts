import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const leftoverThumbs = [
  "src/app/(app)/home-review-queue.tsx",
  "src/components/media-preview.tsx",
  "src/components/clone-output/sidebar.tsx",
  "src/components/clone/reference-inputs.tsx",
  "src/components/video-reference-picker.tsx",
];

for (const relativePath of leftoverThumbs) {
  const source = readFileSync(path.join(repoRoot, relativePath), "utf8");
  assert.doesNotMatch(
    source,
    /no-img-element/,
    `${relativePath} still disables no-img-element`
  );
  assert.doesNotMatch(
    source,
    /<img[\s>]/,
    `${relativePath} still renders a raw img`
  );
}

const mediaPreview = readFileSync(
  path.join(repoRoot, "src/components/media-preview.tsx"),
  "utf8"
);
assert.match(mediaPreview, /cover\?: boolean/);
assert.doesNotMatch(mediaPreview, /fill\?: boolean/);
assert.match(mediaPreview, /from "next\/image"/);
