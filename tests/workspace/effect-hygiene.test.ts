import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveSidebarStatus } from "../../src/lib/use-workspace-notifications";

function countUseEffect(source: string) {
  return [...source.matchAll(/\buseEffect\s*\(/g)].length;
}

function callRanges(source: string, name: string) {
  const ranges: Array<{ start: number; end: number }> = [];
  const pattern = new RegExp(String.raw`\b${name}\s*\(`, "g");
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    const open = start + match[0].length - 1;
    let depth = 0;
    for (let index = open; index < source.length; index += 1) {
      const char = source[index];
      if (char === "(") depth += 1;
      else if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          ranges.push({ start, end: index + 1 });
          break;
        }
      }
    }
  }
  return ranges;
}

const sidebar = readFileSync(
  new URL("../../src/components/sidebar.tsx", import.meta.url),
  "utf8"
);

const notifications = readFileSync(
  new URL("../../src/lib/use-workspace-notifications.ts", import.meta.url),
  "utf8"
);

assert.equal(countUseEffect(sidebar), 2, "sidebar keeps the hydrate effect and the drawer breakpoint listener");
assert.match(sidebar, /useEffect\(\(\) => closeDrawerAtDesktopWidth\(mobileNavRef\), \[\]\)/);
assert.equal(countUseEffect(notifications), 1, "the notifications hook owns the poll effect");
assert.match(sidebar, /= useWorkspaceNotifications\(\s*!publicPolicyPage,\s*initialWorkspaceName\s*\)/);

assert.match(
  sidebar,
  /requestAnimationFrame\(\(\) => \{[\s\S]*?readOptionalStorage\(COLLAPSED_STORAGE_KEY\)/
);

assert.match(sidebar, /const COLLAPSED_STORAGE_KEY = "postforge-sidebar-collapsed";/);
const persistNeedle = "writeOptionalStorage(COLLAPSED_STORAGE_KEY";
const persistIndex = sidebar.indexOf(persistNeedle);
assert.ok(persistIndex >= 0, "sidebar still writes the collapsed preference");
assert.equal(
  callRanges(sidebar, "useEffect").some(
    (range) => persistIndex >= range.start && persistIndex < range.end
  ),
  false,
  "collapsed persist write must live on the toggle path, not in an effect"
);

assert.match(notifications, /const POLL_INTERVAL_MS = 60_000;/);
assert.match(notifications, /setInterval\(refresh,\s*POLL_INTERVAL_MS\)/);
assert.match(notifications, /addEventListener\("focus",\s*refresh\)/);
assert.match(notifications, /removeEventListener\("focus",\s*refresh\)/);
assert.match(notifications, /fetch\("\/api\/workspace-notifications", \{ cache: "no-store" \}\)/);

// The Settings > Notifications toggles and the workspace name still drive the sidebar.
const stored = { id: "workspace-settings", workspaceName: " Studio ", emailFailures: true, emailApprovals: false };
const polled = { generationFailures: 3, approvalsWaiting: 12 };
assert.deepEqual(resolveSidebarStatus(stored, polled), {
  workspaceName: "Studio",
  counts: { generationFailures: 3, approvalsWaiting: 0 },
});
assert.deepEqual(resolveSidebarStatus({ ...stored, emailFailures: false, emailApprovals: true }, polled).counts, {
  generationFailures: 0,
  approvalsWaiting: 12,
});
assert.deepEqual(resolveSidebarStatus(undefined, polled), {
  workspaceName: "PostForge",
  counts: { generationFailures: 0, approvalsWaiting: 0 },
});
assert.deepEqual(
  resolveSidebarStatus({ ...stored, emailApprovals: true }, { generationFailures: -1, approvalsWaiting: 2 }).counts,
  { generationFailures: 0, approvalsWaiting: 0 },
  "malformed counts never reach the badges"
);
assert.match(notifications, /fetchWorkspaceFeature<WorkspaceSidebarSettings>\("connections"\)/);

console.log("sidebar effect hygiene pins passed");
