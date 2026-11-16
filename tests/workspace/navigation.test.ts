import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getActiveWorkspaceItem,
  getSidebarPillOffset,
  workspaceNavigationGroups,
  workspaceNavigationItems,
  workspaceSidebarGroups,
} from "../../src/lib/workspace-navigation";
import { routeOwnsHeader } from "../../src/lib/workspace-header-route";

// Four unlabelled sidebar groups, in the order of the 00 Shell artboard.
assert.deepEqual(
  workspaceSidebarGroups.map((group) => group.map((item) => item.label)),
  [
    ["Home", "Jobs"],
    ["Inspiration", "Clone", "Slideshow", "Generate"],
    ["Gallery", "Collections", "Characters"],
    ["Automations", "Performance", "Spend"],
  ]
);

// The sliding active pill: 36px items, 2px item gap, 20px group gap.
assert.equal(getSidebarPillOffset("/"), 0);
assert.equal(getSidebarPillOffset("/jobs"), 38);
assert.equal(getSidebarPillOffset("/ugc-inspiration"), 94);
assert.equal(getSidebarPillOffset("/generate"), 208);
assert.equal(getSidebarPillOffset("/gallery"), 264);
assert.equal(getSidebarPillOffset("/costs"), 472);
assert.equal(getSidebarPillOffset("/settings"), null);
assert.equal(getSidebarPillOffset(undefined), null);

assert.equal(getActiveWorkspaceItem("/")?.label, "Home");
assert.equal(getActiveWorkspaceItem("/jobs")?.label, "Jobs");
assert.equal(getActiveWorkspaceItem("/jobs?status=active")?.label, "Jobs");
assert.equal(getActiveWorkspaceItem("/ugc-inspiration")?.label, "Inspiration");
assert.equal(getActiveWorkspaceItem("/ugc-clone")?.label, "Clone");
assert.equal(getActiveWorkspaceItem("/ugc-clone/abc123")?.label, "Clone");
assert.equal(getActiveWorkspaceItem("/slideshow")?.label, "Slideshow");
// A URL under a navigation item that is no page of the app belongs to no item, so the not-found
// page never shows a section's title, current item or actions.
assert.equal(getActiveWorkspaceItem("/slideshow/project-123"), undefined);
assert.equal(getActiveWorkspaceItem("/gallery/nope"), undefined);
assert.equal(getActiveWorkspaceItem("/collections/nope/deeper"), undefined);
assert.equal(getActiveWorkspaceItem("/nope"), undefined);
assert.equal(
  getActiveWorkspaceItem("/slideshow?new=true")?.label,
  "Slideshow"
);
assert.equal(getActiveWorkspaceItem("/gallery")?.label, "Gallery");
assert.equal(routeOwnsHeader("/gallery"), true);
assert.equal(routeOwnsHeader("/jobs"), false);
assert.equal(getActiveWorkspaceItem("/automations/new")?.label, "Automations");
assert.equal(getActiveWorkspaceItem("/performance")?.label, "Performance");
assert.equal(getActiveWorkspaceItem("/costs?period=30d")?.label, "Spend");
assert.equal(getActiveWorkspaceItem("/generate/abc123")?.label, "Generate");
assert.equal(getActiveWorkspaceItem("/collections")?.label, "Collections");
assert.equal(getActiveWorkspaceItem("/characters/new")?.label, "Characters");
assert.equal(getActiveWorkspaceItem("/settings")?.label, "Settings");
assert.equal(
  getActiveWorkspaceItem("/automations/new?template=before-after#schedule")?.label,
  "Automations"
);
assert.equal(
  getActiveWorkspaceItem("/characters/new?id=character-1#nose-ears")?.label,
  "Characters"
);
assert.equal(
  getActiveWorkspaceItem("/settings?tab=integrations#tiktok")?.label,
  "Settings"
);
assert.equal(
  getActiveWorkspaceItem("/collections?upload=1#library")?.label,
  "Collections"
);
assert.equal(
  getActiveWorkspaceItem("/performance?period=90d#posts")?.label,
  "Performance"
);
assert.equal(getActiveWorkspaceItem("/not-a-workspace-route"), undefined);
assert.equal(getActiveWorkspaceItem("/generates"), undefined);
assert.equal(getActiveWorkspaceItem("/settings-old"), undefined);

assert.deepEqual(
  workspaceNavigationGroups.utility.map((item) => item.label),
  ["Settings"]
);
assert.equal(
  new Set(workspaceNavigationItems.map((item) => item.label)).size,
  workspaceNavigationItems.length
);
assert.equal(
  new Set(workspaceNavigationItems.map((item) => item.href)).size,
  workspaceNavigationItems.length
);
// One bone primary per route, only where the design has one.
const primaryByLabel = Object.fromEntries(
  workspaceNavigationItems.map((item) => [item.label, item.primaryAction?.href ?? null])
);
assert.deepEqual(primaryByLabel, {
  Home: "/ugc-clone",
  Jobs: null,
  Inspiration: null,
  Clone: null,
  Slideshow: null,
  Generate: null,
  Gallery: "/ugc-clone",
  Collections: "/collections?upload=1",
  Characters: "/characters/new",
  Automations: "/automations/new",
  Performance: null,
  Spend: null,
  Settings: null,
});

const allLabels: string[] = workspaceNavigationItems.map((item) => item.label);

assert.equal(allLabels.includes("Dashboard"), false);
assert.equal(allLabels.includes("Launch Forge"), false);
assert.equal(allLabels.includes("Analytics"), false);
assert.equal(allLabels.includes("Costs"), false);

const sidebarSource = readFileSync(
  new URL("../../src/components/sidebar.tsx", import.meta.url),
  "utf8"
);
const sidebarNavSource = readFileSync(
  new URL("../../src/components/sidebar-nav.tsx", import.meta.url),
  "utf8"
);
const layoutSource = readFileSync(
  new URL("../../src/app/(app)/layout.tsx", import.meta.url),
  "utf8"
);
const shellStyles = readFileSync(
  new URL("../../src/app/styles/shell.css", import.meta.url),
  "utf8"
);

assert.match(sidebarSource, /document\.documentElement\.dataset\.sidebarCollapsed/);
assert.match(sidebarSource, /sidebar-brand/);
assert.match(sidebarSource, /sidebar-header/);
assert.match(sidebarSource, /aria-expanded=\{!desktopCollapsed\}/);
assert.match(layoutSource, /postforge-sidebar-collapsed/);
assert.match(layoutSource, /r\.dataset\.sidebarCollapsed="true"/);
assert.match(shellStyles, /html\[data-sidebar-collapsed="true"\] #workspace-sidebar/);
assert.match(shellStyles, /html\[data-sidebar-collapsed="true"\] #workspace-shell/);
// The collapsed rail keeps the 32px brand tile visible
assert.doesNotMatch(shellStyles, /#workspace-sidebar \.sidebar-brand \{\s*display: none;/);
assert.match(
  shellStyles,
  /html\[data-sidebar-collapsed="true"\] #workspace-sidebar \.sidebar-brand \{\s*flex: 0 0 auto;/
);
assert.doesNotMatch(shellStyles, /body\[data-sidebar-collapsed="true"\]/);

// Subtraction: no group labels, no workspace card, one footer row.
assert.doesNotMatch(sidebarSource + sidebarNavSource, /Local workspace|Self-hosted|Manage|uppercase/);
assert.match(sidebarNavSource, /aria-current=\{active \? "page" : undefined\}/);
assert.match(sidebarNavSource, /aria-label="Workspace navigation"/);
assert.match(sidebarSource, /<span className="sidebar-foot-toggle">\s*<ThemeToggle \/>\s*<\/span>/);

// Count badges come from the notifications poll: failures on Jobs, reviews on Gallery.
assert.match(sidebarNavSource, /item\.label === "Jobs"[\s\S]*?counts\.generationFailures[\s\S]*?tone="bad"/);
assert.match(sidebarNavSource, /item\.label === "Gallery"[\s\S]*?counts\.approvalsWaiting/);

// Primary navigation keeps the default Link prefetch.
assert.doesNotMatch(sidebarSource + sidebarNavSource, /prefetch=\{false\}/);
