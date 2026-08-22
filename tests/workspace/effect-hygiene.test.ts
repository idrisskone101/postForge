import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

assert.equal(countUseEffect(sidebar), 2, "sidebar keeps hydrate + poll effects");

assert.match(
  sidebar,
  /requestAnimationFrame\(\(\) => \{[\s\S]*?readOptionalStorage\("postforge-sidebar-collapsed"\)/
);

const persistNeedle = 'writeOptionalStorage("postforge-sidebar-collapsed"';
const persistIndex = sidebar.indexOf(persistNeedle);
assert.ok(persistIndex >= 0, "sidebar still writes the collapsed preference");
assert.equal(
  callRanges(sidebar, "useEffect").some(
    (range) => persistIndex >= range.start && persistIndex < range.end
  ),
  false,
  "collapsed persist write must live on the toggle path, not in an effect"
);

assert.match(sidebar, /setInterval\(refreshWorkspaceStatus,\s*60_000\)/);
assert.match(sidebar, /addEventListener\("focus",\s*refreshWorkspaceStatus\)/);

console.log("sidebar effect hygiene pins passed");
