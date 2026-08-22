import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function countUseEffect(source: string) {
  return [...source.matchAll(/\buseEffect\s*\(/g)].length;
}

const trimmer = readFileSync(
  new URL("../../src/components/video-trimmer.tsx", import.meta.url),
  "utf8"
);

assert.equal(
  countUseEffect(trimmer),
  2,
  "video-trimmer.tsx keeps thumbnail fetch plus one media-element effect"
);
assert.match(trimmer, /\/api\/ugc-clone\/thumbnails\?path=/);
assert.match(trimmer, /AbortController/);
assert.match(trimmer, /addEventListener\("timeupdate"/);
assert.match(trimmer, /video\.currentTime = startTime/);

console.log("video-trimmer effect hygiene pins passed");
