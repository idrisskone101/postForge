import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceRouteHeader } from "../../src/components/workspace-shell";
import { workspaceNavigationItems } from "../../src/lib/workspace-navigation";

const home = workspaceNavigationItems.find((item) => item.label === "Home");
assert.ok(home);

const markup = renderToStaticMarkup(<WorkspaceRouteHeader activeItem={home} />);
const accessoryMarkup = renderToStaticMarkup(
  <WorkspaceRouteHeader activeItem={home} hasAccessory />
);

assert.match(markup, /id="workspace-header"/);
assert.match(markup, /id="workspace-header-grid"/);
assert.match(markup, /min-h-\[120px\]/);
assert.match(markup, /text-\[28px\]/);
assert.match(markup, /sm:text-\[30px\]/);
assert.match(markup, />Home</);
assert.match(markup, /Today’s jobs, reviews, and the next useful action/);
assert.match(markup, /href="\/ugc-clone"/);
assert.match(markup, /New Clone/);
assert.match(markup, /border-\[var\(--pf-border\)\]/);
assert.doesNotMatch(markup, /pf-masthead/);
assert.doesNotMatch(markup, /pf-masthead-plate/);
assert.doesNotMatch(markup, /min-h-\[104px\]/);
assert.doesNotMatch(markup, /pf-page-title/);
assert.match(accessoryMarkup, /min-h-9/);
assert.match(accessoryMarkup, /lg:grid-cols-\[minmax\(0,1fr\)_auto\]/);
assert.doesNotMatch(accessoryMarkup, /id="workspace-header-default-action"/);
