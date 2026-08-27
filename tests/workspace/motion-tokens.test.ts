import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function source(relPath: string) {
  return readFileSync(path.join(repoRoot, relPath), "utf8");
}

const globals = source("src/app/globals.css");
const dashboardCritical = source("src/app/dashboard-critical.css");
const packageJson = source("package.json");
const sidebar = source("src/components/sidebar.tsx");

const motionClasses = [
  ".t-press",
  ".t-panel",
  ".t-modal-content",
  ".t-modal-overlay",
  ".t-tooltip-content",
  ".t-input-shake",
];

for (const className of motionClasses) {
  assert.match(globals, new RegExp(className.replace(".", "\\.")));
}

assert.doesNotMatch(packageJson, /"motion"\s*:/);
assert.doesNotMatch(packageJson, /"framer-motion"\s*:/);

assert.equal(
  [...sidebar.matchAll(/\buseEffect\s*\(/g)].length,
  2,
  "sidebar keeps exactly two useEffect hooks"
);

assert.doesNotMatch(
  globals,
  /\.dark\s*\{[^}]*--pf-canvas:\s*#0a0a0b/i
);
assert.doesNotMatch(
  dashboardCritical,
  /--pf-canvas:\s*#0a0a0b/i
);

assert.match(globals, /\.dark\s*\{[^}]*--pf-canvas:\s*#2a2a2e/i);
assert.match(dashboardCritical, /--pf-canvas:\s*#2a2a2e/i);
assert.match(globals, /--pf-surface:\s*#3a3a40/i);
assert.match(globals, /--pf-active:\s*#45454c/i);
assert.match(globals, /--pf-border:\s*#5c5c64/i);
assert.match(globals, /--pf-muted:\s*#c4c4cc/i);
assert.match(globals, /--sidebar-accent:\s*#4a322c/i);

assert.match(globals, /\[data-automation-preview-stage="true"\][\s\S]*?#09090b/i);
assert.match(dashboardCritical, /\[data-automation-preview-stage="true"\][\s\S]*?#09090b/i);

assert.equal(existsSync(path.join(repoRoot, "src/components/pf-system")), false);
assert.equal(existsSync(path.join(repoRoot, "src/components/motion")), false);

console.log("motion token pins passed");
