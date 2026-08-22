import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const performanceWorkspace = readFileSync(
  new URL("../../src/app/performance/use-performance-workspace.ts", import.meta.url),
  "utf8"
);

assert.doesNotMatch(
  performanceWorkspace,
  /setSelectedSource\(sourceOptions\[0\]/
);
assert.match(
  performanceWorkspace,
  /const activeSource = sourceOptions\.includes\(selectedSource\)/
);
assert.match(performanceWorkspace, /setSelectedSource\("csv"\)/);
