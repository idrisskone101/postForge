import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const page = source("src/app/(app)/settings/page.tsx");
const client = source("src/app/(app)/settings/settings-page-client.tsx");
const navigation = source("src/app/(app)/settings/settings-navigation.tsx");
const row = source("src/app/(app)/settings/integration-row.tsx");
const panel = source("src/app/(app)/settings/integrations-panel.tsx");

// The deep-linked tab is resolved on the server, so the first paint is the final section.
assert.match(page, /searchParams/);
assert.match(page, /<SettingsPageClient initialTab=\{tab\} \/>/);
assert.match(client, /useSyncExternalStore\(subscribeSettingsTab, readSettingsTab, \(\) => initialTab\)/);

// 236px sub-nav from 1280px, one scrolling segmented row below it.
assert.match(navigation, /min-\[1280px\]:w-\[236px\]/);
assert.match(navigation, /overflow-x-auto overscroll-x-contain/);
assert.match(client, /min-\[1280px\]:flex-row/);

// Integration rows use the 18 Settings column widths, and stack below 720px of row width.
for (const width of ["w-[168px]", "w-[150px]", "w-[170px]", "w-28"]) {
  assert.ok(row.includes(`@min-[720px]:${width}`), `row keeps the ${width} column`);
}
assert.match(panel, /@container/);

// Copy is real text: no attribute-drawn copy, no paint swap after window load.
for (const file of [client, navigation, row, panel]) {
  assert.doesNotMatch(file, /data-settings-text|data-settings-title|data-lcp|useWindowLoadReady/);
}
assert.doesNotMatch(source("src/app/styles/transitional.css"), /data-settings-/);

console.log("Settings layout invariants passed");
