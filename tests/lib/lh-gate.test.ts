import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LH_ROUTES } from "../../scripts/lh-routes.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const scoreScript = readFileSync(
  path.join(repoRoot, "scripts/lh-score.mjs"),
  "utf8"
);
const gateScript = readFileSync(
  path.join(repoRoot, "scripts/lh-gate.mjs"),
  "utf8"
);

assert.match(scoreScript, /--preset=desktop/);
assert.doesNotMatch(
  scoreScript,
  /screenEmulation\.mobile=\$\{formFactor === "mobile"\}/
);
assert.match(scoreScript, /form-factor=mobile/);

assert.match(gateScript, /LH_MIN_PERFORMANCE/);
assert.match(gateScript, /LH_MAX_CLS/);
assert.match(gateScript, /LH_MAX_LCP_MS/);
assert.match(gateScript, /performance >= \$\{minPerformance\}/);
assert.match(gateScript, /discarding warmup audit/);
assert.match(gateScript, /retrying \$\{row\.route\} in isolation/);

const bootScript = readFileSync(
  path.join(repoRoot, "scripts/kode-lighthouse.sh"),
  "utf8"
);
assert.match(bootScript, /warmup GET/);

assert.ok(LH_ROUTES.length >= 18, "expected at least 18 scored routes");
assert.ok(LH_ROUTES.includes("/"));
assert.ok(LH_ROUTES.includes("/privacy"));
assert.ok(LH_ROUTES.includes("/data-deletion"));
assert.equal(new Set(LH_ROUTES).size, LH_ROUTES.length, "routes must be unique");

function evaluateRow(
  row: {
    performance?: number;
    cls?: number;
    lcp?: number;
    error?: string;
  },
  thresholds: { minPerformance: number; maxCls: number; maxLcpMs: number }
) {
  const failures: string[] = [];
  if (row.error) {
    failures.push(row.error);
    return failures;
  }
  if (
    typeof row.performance !== "number" ||
    row.performance < thresholds.minPerformance
  ) {
    failures.push("performance");
  }
  if (typeof row.cls !== "number" || row.cls > thresholds.maxCls) {
    failures.push("cls");
  }
  if (typeof row.lcp !== "number" || row.lcp > thresholds.maxLcpMs) {
    failures.push("lcp");
  }
  return failures;
}

assert.deepEqual(
  evaluateRow({ performance: 90, cls: 0.05, lcp: 2000 }, {
    minPerformance: 90,
    maxCls: 0.1,
    maxLcpMs: 2500,
  }),
  []
);
assert.deepEqual(
  evaluateRow({ performance: 89, cls: 0.05, lcp: 2000 }, {
    minPerformance: 90,
    maxCls: 0.1,
    maxLcpMs: 2500,
  }),
  ["performance"]
);
assert.deepEqual(
  evaluateRow({ performance: 95, cls: 0.11, lcp: 2000 }, {
    minPerformance: 90,
    maxCls: 0.1,
    maxLcpMs: 2500,
  }),
  ["cls"]
);
assert.deepEqual(
  evaluateRow({ performance: 95, cls: 0.05, lcp: 2600 }, {
    minPerformance: 90,
    maxCls: 0.1,
    maxLcpMs: 2500,
  }),
  ["lcp"]
);
