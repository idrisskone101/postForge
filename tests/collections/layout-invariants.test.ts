import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const collections = [
  source("src/app/(app)/collections/collections-page-client.tsx"),
  source("src/app/(app)/collections/collections-library.tsx"),
  source("src/app/(app)/collections/collections-detail.tsx"),
  source("src/app/(app)/collections/collections-empty.tsx"),
].join("\n");
assert.match(collections, /grid-cols-2[^"\n]*min-\[420px\]:grid-cols-3/);
assert.match(collections, /safe-area-inset-bottom/);
assert.match(collections, /pt-\[env\(safe-area-inset-top\)\]/);
assert.match(source("src/app/(app)/collections/collections-empty.tsx"), /data-empty-heading="true"/);
assert.match(source("src/app/(app)/collections/page.tsx"), /CollectionsPageLazy/);
