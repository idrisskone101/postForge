import assert from "node:assert/strict";
import {
  withoutInspiration,
  workspaceNavigationGroups,
} from "../../src/lib/workspace-navigation";

// A normal build keeps the full sidebar.
assert.deepEqual(
  workspaceNavigationGroups.create.map((item) => item.label),
  ["Inspiration", "Clone", "Slideshow", "Generate"]
);

// The demo sidebar drops Inspiration and keeps the rest of the group in order.
assert.deepEqual(
  withoutInspiration(workspaceNavigationGroups.create).map((item) => item.label),
  ["Clone", "Slideshow", "Generate"]
);

// Nothing else in the sidebar links to Inspiration, header actions included.
const otherItems: ReadonlyArray<{ href: string; primaryAction?: { href: string } }> = [
  ...workspaceNavigationGroups.overview,
  ...workspaceNavigationGroups.library,
  ...workspaceNavigationGroups.publish,
  ...workspaceNavigationGroups.utility,
];
for (const item of otherItems) {
  assert.notEqual(item.href, "/ugc-inspiration", item.href);
  assert.notEqual(item.primaryAction?.href, "/ugc-inspiration", item.href);
}

console.log("demo navigation tests passed");
