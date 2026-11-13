import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  isSettingsTab,
  SETTINGS_NAVIGATION,
  SettingsNavigation,
} from "../../src/app/(app)/settings/settings-navigation";
import { DeveloperSettingsPanel } from "../../src/app/(app)/settings/webhooks-panel";

assert.deepEqual(
  SETTINGS_NAVIGATION.map(({ id, group }) => [id, group]),
  [
    ["profile", "workspace"],
    ["models", "workspace"],
    ["billing", "workspace"],
    ["integrations", "workspace"],
    ["publishing", "workspace"],
    ["team", "workspace"],
    ["notifications", "workspace"],
    ["api-keys", "developer"],
    ["webhooks", "developer"],
  ]
);

assert.equal(isSettingsTab("api-keys"), true);
assert.equal(isSettingsTab("models"), true);
assert.equal(isSettingsTab("webhooks"), true);
assert.equal(isSettingsTab("secrets"), false);

const navigationMarkup = renderToStaticMarkup(
  <SettingsNavigation tab="api-keys" onSelect={() => {}} />
);
assert.match(navigationMarkup, /overflow-x-auto/);
assert.match(navigationMarkup, /overscroll-x-contain/);
assert.match(navigationMarkup, />API keys</);
assert.match(navigationMarkup, />Available models</);
assert.match(navigationMarkup, />Webhooks</);
assert.match(navigationMarkup, /aria-current="page"[^>]*>[\s\S]*API keys/);
assert.doesNotMatch(navigationMarkup, /hidden h-9[^>]*>[\s\S]*API keys/);

const webhooksMarkup = renderToStaticMarkup(
  <DeveloperSettingsPanel />
);
assert.match(webhooksMarkup, /data-developer-settings-panel="webhooks"/);
assert.match(webhooksMarkup, /Not configured/);
assert.match(webhooksMarkup, /No webhook endpoints are registered/);
assert.match(webhooksMarkup, /No events are being delivered/);
assert.equal(webhooksMarkup.match(/not configured|not available/gi)?.length, 1, "the state is said once");
assert.doesNotMatch(webhooksMarkup, /<button|<a /, "nothing in the panel offers an action");
assert.match(webhooksMarkup, /Signed events[\s\S]*Reliable delivery[\s\S]*Delivery history/);
assert.doesNotMatch(webhooksMarkup, /Delivery successful/);
