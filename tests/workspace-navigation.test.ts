import assert from "node:assert/strict";
import {
  getActiveWorkspaceItem,
  workspaceNavigationGroups,
} from "../src/lib/workspace-navigation";

const primaryLabels = workspaceNavigationGroups.primary.map((item) => item.label);
assert.deepEqual(primaryLabels, [
  "Home",
  "Inspiration",
  "Clone",
  "Slideshow",
  "Gallery",
  "Spend",
]);

const toolLabels = workspaceNavigationGroups.tools.map((item) => item.label);
assert.deepEqual(toolLabels, ["Generate"]);

assert.equal(getActiveWorkspaceItem("/")?.label, "Home");
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
assert.equal(getActiveWorkspaceItem("/costs?period=30d")?.label, "Spend");
assert.equal(getActiveWorkspaceItem("/generate/abc123")?.label, "Generate");

const allLabels: string[] = [
  ...workspaceNavigationGroups.primary,
  ...workspaceNavigationGroups.tools,
].map((item) => item.label);

assert.equal(allLabels.includes("Dashboard"), false);
assert.equal(allLabels.includes("Launch Forge"), false);
assert.equal(allLabels.includes("Analytics"), false);
assert.equal(allLabels.includes("Costs"), false);
