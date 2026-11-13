import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { routeOwnsHeader, routeProvidesHeaderAccessory } from "../../src/lib/workspace-header-route";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const routeDir = "src/app/(app)/collections";
const routeFiles = readdirSync(new URL(`../../${routeDir}/`, import.meta.url))
  .filter((file) => file.endsWith(".tsx"))
  .map((file) => source(`${routeDir}/${file}`));
const pinterest = [
  "pinterest-import-dialog",
  "pinterest-import-search",
  "pinterest-import-results",
  "pinterest-import-footer",
].map((name) => source(`src/components/${name}.tsx`));

const page = source(`${routeDir}/page.tsx`);
assert.match(page, /readWorkspaceFeatureRecords/, "records are read on the server for first paint");
assert.doesNotMatch(page, /dynamic\(|ssr: false|CollectionsPageLazy/, "no client-only lazy page");
assert.match(page, /<Suspense fallback=\{<CollectionsSkeleton \/>\}>/);

assert.equal(routeOwnsHeader("/collections"), false, "the shell renders the Collections title");
assert.equal(routeProvidesHeaderAccessory("/collections"), true, "the route renders both header actions");
const client = source(`${routeDir}/collections-page-client.tsx`);
assert.match(client, /<WorkspaceHeaderAccessory>[\s\S]*Import from Pinterest[\s\S]*Upload images/);

for (const text of [...routeFiles, ...pinterest]) {
  assert.doesNotMatch(text, /data-empty-|pf-button-|pf-card|max-w-\[1280px\]|data-page-inset/);
  assert.doesNotMatch(text, /window\.(confirm|prompt)/, "confirms and names use designed dialogs");
  assert.doesNotMatch(text, /[\u2013\u2014]/, "no long dashes in copy");
}

const library = source(`${routeDir}/collections-library.tsx`);
assert.match(library, /min-\[87\.5rem\]:grid-cols-6/, "six asset columns at the artboard width");
assert.match(library, /w-\[168px\]/, "drop zone column is 168px like the artboard");
assert.match(source(`${routeDir}/collection-tile.tsx`), /h-\[196px\]/, "collection mosaic is 196px tall");
assert.match(source(`${routeDir}/collections-detail.tsx`), /sm:max-w-\[520px\]/);
