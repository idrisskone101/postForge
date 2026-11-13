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
assert.match(automations, /data-automations-hub="true" className="flex min-h-0 flex-1 flex-col gap-3"/);
assert.doesNotMatch(automations, /data-page-inset|max-w-\[1280px\]|px-5 py-5/);
assert.match(source("src/app/(app)/automations/planning-calendar.tsx"), /grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7/);
assert.match(source("src/app/(app)/automations/video-automation-list.tsx"), /md:grid-cols-\[minmax\(0,1fr\)_150px_140px_160px_30px\]/);
assert.match(source("src/app/(app)/automations/slideshow-automation-list.tsx"), /xl:w-\[340px\]/);
assert.match(source("src/app/(app)/automations/new/automation-builder-preview-pane.tsx"), /xl:w-\[372px\]/);
assert.match(automationBuilder, /h-full[^"\n]*max-h-\[860px\][^"\n]*overflow-hidden/);
assert.match(automationBuilder, /pf-safe-overlay/);
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
assert.doesNotMatch(source("src/app/(app)/automations/new/playbook-picker.tsx"), /data-playbook-(lede|title|name|blurb|scratch)|data-lcp|sr-only/);
assert.match(source("src/app/(app)/automations/new/playbook-card.tsx"), />\s*\{template\.name\}\s*</);
assert.match(source("src/app/(app)/automations/new/playbook-overlay-static.tsx"), /<PlaybookPicker picker=\{picker\} \/>/);
assert.match(source("src/app/(app)/automations/new/automation-builder-client.tsx"), /data-picker-open=\{templateOpen \? "true" : undefined\}/);
assert.match(
  source("src/app/(app)/automations/new/automation-builder-phase-form-lazy.tsx"),
  /import\("\.\/automation-builder-phase-form"\)/,
);
assert.match(
  source("src/app/(app)/automations/new/automation-builder-session-lazy.tsx"),
  /import\("\.\/automation-builder-session"\)/,
);
assert.doesNotMatch(source("src/app/(app)/automations/automations-page-client.tsx"), /data-empty-|sr-only/);
assert.match(source("src/app/(app)/automations/automations-page-client.tsx"), /<EmptyState/);
assert.doesNotMatch(
  source("src/app/(app)/automations/automations-page-client.tsx"),
  /liveClassName=.*max-w-md/,
);
assert.match(source("src/app/(app)/automations/page.tsx"), /AutomationsPageLazy/);
assert.match(source("src/app/(app)/automations/new/automation-playbook-overlay.tsx"), /data-playbook-chrome="true"/);
