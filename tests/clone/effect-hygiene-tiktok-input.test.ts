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

const tiktokInput = readFileSync(
  new URL("../../src/components/tiktok-input.tsx", import.meta.url),
  "utf8"
);

assert.equal(
  countUseEffect(tiktokInput),
  2,
  "tiktok-input keeps sources fetch plus one preselect effect"
);
assert.match(tiktokInput, /apiGet<SourceListPage>\("\/api\/ugc-clone\/sources"\)/);
assert.match(tiktokInput, /if \(!preselectedSourceId\) \{\s*autoSelectedIdRef\.current = null;/);
assert.equal(
  callRanges(tiktokInput, "useEffect").filter((range) =>
    /autoSelectedIdRef\.current = null/.test(
      tiktokInput.slice(range.start, range.end)
    )
  ).length,
  1,
  "ref reset belongs in the preselect effect, not a second effect"
);

console.log("tiktok-input effect hygiene pins passed");
