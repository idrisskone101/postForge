import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const costsPageClient = readFileSync(
  new URL("../../src/app/(app)/costs/costs-page-client.tsx", import.meta.url),
  "utf8"
);

assert.doesNotMatch(costsPageClient, /useEffect\(\(\)\s*=>\s*\{?\s*setQueryDraft\(search\)/);
assert.match(costsPageClient, /search !== prevSearch/);
assert.match(costsPageClient, /setQueryDraft\(search\)/);
assert.match(costsPageClient, /window\.setTimeout/);
assert.match(costsPageClient, /300/);
