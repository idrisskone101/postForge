import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DeveloperSettingsPanel,
  isSettingsTab,
  SETTINGS_NAVIGATION,
  SettingsNavigation,
} from "../src/app/settings/settings-page-client";

assert.deepEqual(
  SETTINGS_NAVIGATION.map(({ id, group }) => [id, group]),
  [
    ["profile", "workspace"],
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
assert.equal(isSettingsTab("webhooks"), true);
assert.equal(isSettingsTab("secrets"), false);

const navigationMarkup = renderToStaticMarkup(
  <SettingsNavigation tab="api-keys" onSelect={() => {}} />
);
assert.match(navigationMarkup, /overflow-x-auto/);
assert.match(navigationMarkup, /overscroll-x-contain/);
assert.match(navigationMarkup, />API keys</);
assert.match(navigationMarkup, />Webhooks</);
assert.match(navigationMarkup, /aria-current="page"[^>]*>[\s\S]*API keys/);
assert.doesNotMatch(navigationMarkup, /hidden h-9[^>]*>[\s\S]*API keys/);

const apiKeysMarkup = renderToStaticMarkup(
  <DeveloperSettingsPanel tab="api-keys" />
);
assert.match(apiKeysMarkup, /data-developer-settings-panel="api-keys"/);
assert.match(apiKeysMarkup, /NOT CONFIGURED/);
assert.match(apiKeysMarkup, /No API keys have been issued/);
assert.match(apiKeysMarkup, /will not fabricate, reveal, or retain credentials/);
assert.match(apiKeysMarkup, /API key service not configured/);
assert.match(apiKeysMarkup, /disabled=""/);
assert.doesNotMatch(apiKeysMarkup, /pf_[a-zA-Z0-9]{16,}/);

const webhooksMarkup = renderToStaticMarkup(
  <DeveloperSettingsPanel tab="webhooks" />
);
assert.match(webhooksMarkup, /data-developer-settings-panel="webhooks"/);
assert.match(webhooksMarkup, /NOT CONFIGURED/);
assert.match(webhooksMarkup, /No webhook endpoints are registered/);
assert.match(webhooksMarkup, /No events are being delivered/);
assert.match(webhooksMarkup, /Webhook delivery not configured/);
assert.match(webhooksMarkup, /disabled=""/);
assert.doesNotMatch(webhooksMarkup, /Delivery successful/);
