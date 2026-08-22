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

const editor = readFileSync(
  new URL("../../src/components/slideshow/slideshow-editor.tsx", import.meta.url),
  "utf8",
);
const studio = readFileSync(
  new URL("../../src/components/slideshow/slideshow-studio.tsx", import.meta.url),
  "utf8",
);
const publish = readFileSync(
  new URL("../../src/components/slideshow/publish-dialog.tsx", import.meta.url),
  "utf8",
);

assert.ok(
  countUseEffect(editor) <= 2,
  `slideshow-editor.tsx keeps at most 2 useEffect calls, found ${countUseEffect(editor)}`,
);
assert.doesNotMatch(
  editor,
  /viewModeRef\.current = viewMode/,
  "viewModeRef must be written by changeViewMode, not synced from viewMode in an effect",
);
assert.equal(
  callRanges(editor, "useEffect").some((range) =>
    /viewModeRef\.current\s*=\s*viewMode/.test(editor.slice(range.start, range.end)),
  ),
  false,
  "viewModeRef.current = viewMode must not appear inside a useEffect",
);
assert.doesNotMatch(editor, /\[selectedSlideId,\s*viewMode\]/);
assert.match(editor, /scrollSelectedThumbIntoView/);
assert.match(
  editor,
  /const setSelection = useCallback\(\(id: string\) => \{[\s\S]*?scrollSelectedThumbIntoView\(\);/,
);

assert.ok(
  countUseEffect(studio) <= 2,
  `slideshow-studio.tsx keeps at most 2 useEffect calls, found ${countUseEffect(studio)}`,
);
assert.match(studio, /AbortController/);
assert.match(studio, /fetchModelsCatalog\(/);
assert.match(studio, /fetchPlatformCollections\(/);
assert.match(studio, /watchStudioDrafts\(/);
assert.match(studio, /watchStudioDraftsRefresh\(/);
assert.match(studio, /key=\{publishProject\?\.id\}/);
assert.match(studio, /window\.setTimeout\(\(\) => setToast\(null\), 3200\)/);

assert.equal(countUseEffect(publish), 0, "publish-dialog must not reset caption in an effect");
assert.doesNotMatch(publish, /\[open,\s*project\]/);
assert.match(publish, /resetKey !== appliedResetKey/);

console.log("slideshow effect hygiene pins passed");
