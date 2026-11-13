import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const automations = source("src/app/(app)/automations/automations-page-client.tsx");
const automationBuilder = [
  source("src/app/(app)/automations/new/automation-builder-client.tsx"),
  source("src/app/(app)/automations/new/automation-playbook-overlay.tsx"),
  source("src/app/(app)/automations/new/automation-builder-session.tsx"),
].join("\n");
assert.match(automations, /grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7/);
assert.match(automations, /h-36 w-full min-w-0 max-w-72/);
assert.match(automationBuilder, /h-full[^"\n]*max-h-\[860px\][^"\n]*overflow-hidden/);
assert.match(automationBuilder, /pf-safe-overlay/);
assert.match(automationBuilder, /pf-safe-overlay[^"\n]*[\s\S]*?max-h-full[^"\n]*overflow-y-auto/);
assert.match(
  automationBuilder,
  /pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\]/
);
assert.match(source("src/app/(app)/automations/new/automation-playbook-overlay.tsx"), /data-automation-overlay="true"/);
assert.match(source("src/app/(app)/automations/new/automation-playbook-overlay.tsx"), /position: "fixed"/);
assert.match(source("src/app/(app)/automations/new/page.tsx"), /PlaybookOverlayStatic/);
assert.match(source("src/app/(app)/automations/new/page.tsx"), /AutomationBuilderClientLazy/);
assert.doesNotMatch(
  source("src/app/(app)/automations/new/automation-builder-client.tsx"),
  /from "\.\/use-automation-builder"/,
);
assert.match(source("src/app/(app)/automations/new/automation-builder-preview-pane.tsx"), /data-automation-preview-stage="true"/);
assert.match(source("src/app/(app)/automations/new/playbook-picker.tsx"), /data-playbook-body="true"/);
assert.doesNotMatch(source("src/app/(app)/automations/new/page.tsx"), /Suspense/);
assert.match(source("src/app/(app)/automations/new/page.tsx"), /AutomationBuilderClient/);
assert.match(source("src/app/(app)/automations/new/page.tsx"), /SlideshowAutomationBuilderLazy/);
assert.doesNotMatch(
  source("src/app/(app)/automations/new/page.tsx"),
  /from "\.\/slideshow-automation-builder"/,
);
assert.match(source("src/app/(app)/automations/new/playbook-picker.tsx"), /data-playbook-lede=/);
assert.match(source("src/app/(app)/automations/new/playbook-card.tsx"), /data-playbook-name=\{template\.name\}/);
assert.match(source("src/app/(app)/automations/new/automation-builder-client.tsx"), /data-picker-open=\{templateOpen \? "true" : undefined\}/);
assert.match(
  source("src/app/(app)/automations/new/automation-builder-phase-form-lazy.tsx"),
  /import\("\.\/automation-builder-phase-form"\)/,
);
assert.match(
  source("src/app/(app)/automations/new/automation-builder-session-lazy.tsx"),
  /import\("\.\/automation-builder-session"\)/,
);
assert.match(source("src/app/(app)/automations/automations-page-client.tsx"), /data-empty-heading="true"/);
assert.doesNotMatch(
  source("src/app/(app)/automations/automations-page-client.tsx"),
  /liveClassName=.*max-w-md/,
);
assert.match(source("src/app/(app)/automations/page.tsx"), /AutomationsPageLazy/);
assert.match(source("src/app/(app)/automations/new/playbook-picker.tsx"), /data-playbook-chrome="true"/);
