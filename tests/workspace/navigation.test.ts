import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getActiveWorkspaceItem,
  workspaceNavigationGroups,
  workspaceNavigationItems,
} from "../../src/lib/workspace-navigation";

const primaryLabels = workspaceNavigationGroups.primary.map((item) => item.label);
assert.deepEqual(primaryLabels, [
  "Home",
  "Jobs",
  "Inspiration",
  "Clone",
  "Slideshow",
  "Gallery",
  "Automations",
  "Performance",
  "Spend",
]);

const toolLabels = workspaceNavigationGroups.tools.map((item) => item.label);
assert.deepEqual(toolLabels, ["Generate", "Collections", "Characters"]);

assert.equal(getActiveWorkspaceItem("/")?.label, "Home");
assert.equal(getActiveWorkspaceItem("/jobs")?.label, "Jobs");
assert.equal(getActiveWorkspaceItem("/jobs?status=active")?.label, "Jobs");
assert.equal(getActiveWorkspaceItem("/ugc-inspiration")?.label, "Inspiration");
assert.equal(getActiveWorkspaceItem("/ugc-clone")?.label, "Clone");
assert.equal(getActiveWorkspaceItem("/ugc-clone/abc123")?.label, "Clone");
assert.equal(getActiveWorkspaceItem("/slideshow")?.label, "Slideshow");
assert.equal(
  getActiveWorkspaceItem("/slideshow/project-123")?.label,
  "Slideshow"
);
assert.equal(
  getActiveWorkspaceItem("/slideshow?new=true")?.label,
  "Slideshow"
);
assert.equal(getActiveWorkspaceItem("/gallery")?.label, "Gallery");
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
assert.equal(
  workspaceNavigationItems.find((item) => item.label === "Automations")
    ?.primaryAction.href,
  "/automations/new"
);
assert.equal(
  workspaceNavigationItems.find((item) => item.label === "Characters")
    ?.primaryAction.href,
  "/characters/new"
);
assert.equal(
  workspaceNavigationItems.find((item) => item.label === "Settings")
    ?.primaryAction.href,
  "/settings?tab=integrations"
);

const allLabels: string[] = [
  ...workspaceNavigationGroups.primary,
  ...workspaceNavigationGroups.tools,
  ...workspaceNavigationGroups.utility,
].map((item) => item.label);

assert.equal(allLabels.includes("Dashboard"), false);
assert.equal(allLabels.includes("Launch Forge"), false);
assert.equal(allLabels.includes("Analytics"), false);
assert.equal(allLabels.includes("Costs"), false);

const sidebarSource = readFileSync(
  new URL("../../src/components/sidebar.tsx", import.meta.url),
  "utf8"
);
const shellSource = readFileSync(
  new URL("../../src/components/workspace-shell.tsx", import.meta.url),
  "utf8"
);
const layoutSource = readFileSync(
  new URL("../../src/app/(app)/layout.tsx", import.meta.url),
  "utf8"
);
const globalStyles = readFileSync(
  new URL("../../src/app/globals.css", import.meta.url),
  "utf8"
);

assert.match(shellSource, /min-w-0 overflow-x-clip/);
assert.doesNotMatch(shellSource, /workspaceHeaderAccessory/);
assert.doesNotMatch(globalStyles, /data-workspace-header-accessory/);
assert.match(sidebarSource, /document\.documentElement\.dataset\.sidebarCollapsed/);
assert.match(sidebarSource, /sidebar-brand/);
assert.match(sidebarSource, /sidebar-header/);
assert.match(layoutSource, /postforge-sidebar-collapsed/);
assert.match(layoutSource, /r\.dataset\.sidebarCollapsed="true"/);
assert.match(globalStyles, /html\[data-sidebar-collapsed="true"\] #workspace-sidebar/);
assert.match(globalStyles, /html\[data-sidebar-collapsed="true"\] #workspace-shell/);
assert.match(globalStyles, /#workspace-sidebar \.sidebar-brand \{\s*display: none;/);
assert.doesNotMatch(globalStyles, /body\[data-sidebar-collapsed="true"\]/);
