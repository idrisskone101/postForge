import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const settingsPageClient = readFileSync(
  new URL("../../src/app/settings/settings-page-client.tsx", import.meta.url),
  "utf8"
);

assert.doesNotMatch(settingsPageClient, /useState<SettingsTab>/);
assert.doesNotMatch(settingsPageClient, /setTab\(/);
assert.match(settingsPageClient, /const tab: SettingsTab = isSettingsTab\(requested\)/);
assert.match(settingsPageClient, /params\.set\("tab", next\)/);
assert.match(
  settingsPageClient,
  /onOAuthCallback[\s\S]*params\.set\("tab", "integrations"\)/
);
