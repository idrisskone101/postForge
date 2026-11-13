import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const settings = source("src/app/(app)/settings/settings-page-client.tsx");
assert.match(settings, /lg:grid-cols-\[210px_minmax\(0,1fr\)\]/);

// Dense desktop controls become scoped scrollers or mobile-native cards.
assert.match(settings, /overflow-x-auto overscroll-x-contain/);
assert.match(settings, /data-settings-nav="true"/);
assert.match(settings, /data-settings-panel="true"/);
assert.match(source("src/app/(app)/settings/integrations-panel.tsx"), /data-settings-owned="true"/);
assert.match(source("src/app/(app)/settings/integrations-panel.tsx"), /data-settings-copy="true"/);
assert.match(source("src/app/(app)/settings/social-integration-card.tsx"), /data-settings-copy="true"/);
assert.match(source("src/app/(app)/settings/page.tsx"), /SettingsPageClient/);
assert.match(source("src/app/(app)/settings/integrations-panel.tsx"), /data-settings-title="Integrations"/);
