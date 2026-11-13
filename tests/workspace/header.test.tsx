import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceRouteHeader } from "../../src/components/workspace-shell";
import { workspaceNavigationItems } from "../../src/lib/workspace-navigation";

function item(label: string) {
  const found = workspaceNavigationItems.find((entry) => entry.label === label);
  assert.ok(found, `${label} is a workspace route`);
  return found;
}

const markup = renderToStaticMarkup(
  <WorkspaceRouteHeader activeItem={item("Automations")} />
);

// The header is the title only: real text in an h1, no description line.
assert.match(markup, /<header id="workspace-header"/);
assert.match(markup, /<h1 class="wb-page-title">Automations<\/h1>/);
assert.doesNotMatch(markup, /sr-only/);
assert.doesNotMatch(markup, /<p\b/);
assert.doesNotMatch(markup, /data-header-copy|data-workspace-title|pf-masthead/);

// A route with a primary in the design gets the one bone action.
assert.match(markup, /id="workspace-header-default-action"/);
assert.match(markup, /href="\/automations\/new"/);
assert.match(markup, /wb-btn wb-btn-primary wb-btn-40/);
assert.match(markup, />New automation</);
assert.equal(markup.match(/wb-btn-primary/g)?.length, 1);

// Jobs, Performance, Spend and Settings have no primary in the design.
for (const label of ["Jobs", "Performance", "Spend", "Settings"]) {
  const quiet = renderToStaticMarkup(<WorkspaceRouteHeader activeItem={item(label)} />);
  assert.match(quiet, new RegExp(`>${label}</h1>`));
  assert.doesNotMatch(quiet, /workspace-header-default-action|wb-btn-primary/);
  assert.match(quiet, /id="workspace-header-accessory"/);
}

// Routes that portal their own controls keep the slot and drop the default action.
const accessoryMarkup = renderToStaticMarkup(
  <WorkspaceRouteHeader activeItem={item("Characters")} hasAccessory />
);
assert.match(accessoryMarkup, /id="workspace-header-accessory"/);
assert.doesNotMatch(accessoryMarkup, /id="workspace-header-default-action"/);
