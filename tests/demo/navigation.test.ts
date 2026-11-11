import assert from "node:assert/strict";
import {
  withoutInspiration,
  workspaceNavigationGroups,
} from "../../src/lib/workspace-navigation";

// A normal build keeps the full rail.
assert.ok(workspaceNavigationGroups.primary.some((item) => item.label === "Inspiration"));

const demo = withoutInspiration(workspaceNavigationGroups);
const items = [...demo.primary, ...demo.tools, ...demo.utility];

assert.deepEqual(
  demo.primary.map((item) => item.label),
  ["Home", "Jobs", "Clone", "Slideshow", "Gallery", "Automations", "Performance", "Spend"]
);
assert.deepEqual(demo.tools, workspaceNavigationGroups.tools);
assert.deepEqual(demo.utility, workspaceNavigationGroups.utility);

// Nothing left in the demo rail links to Inspiration, including quick actions.
for (const item of items) {
  assert.notEqual(item.href, "/ugc-inspiration", item.label);
  assert.notEqual(item.primaryAction.href, "/ugc-inspiration", item.label);
}
assert.deepEqual(demo.primary.find((item) => item.label === "Clone")?.primaryAction, {
  label: "View Gallery",
  href: "/gallery",
});

console.log("demo navigation tests passed");
