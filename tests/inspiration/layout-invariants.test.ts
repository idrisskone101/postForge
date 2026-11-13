import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const inspirationLoading = source("src/app/(app)/ugc-inspiration/inspiration-page-client.tsx");
const inspirationPage = source("src/app/(app)/ugc-inspiration/page.tsx");
const inspiration = source(
  "src/app/(app)/ugc-inspiration/inspiration-page-client.tsx"
);
assert.doesNotMatch(inspirationPage + inspiration, /100vh/);

// Loading views reflow inside their cards instead of relying on shell clipping.
assert.match(inspirationLoading, /max-w-\[1280px\]/);
assert.match(inspirationLoading, /px-4 py-5[^"\n]*lg:py-7/);
assert.match(source("src/app/(app)/ugc-inspiration/inspiration-page-client.tsx"), /next\/dynamic/);
assert.match(source("src/app/(app)/ugc-inspiration/page.tsx"), /InspirationPageLazy/);
assert.match(
  source("src/app/(app)/ugc-inspiration/inspiration-page-lazy.tsx"),
  /useWindowLoadReady/,
);
