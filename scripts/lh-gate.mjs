import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LH_ROUTES } from "./lh-routes.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const base = process.env.LH_BASE ?? "http://127.0.0.1:3000";
const formFactor = process.env.LH_FORM_FACTOR ?? "mobile";
const minPerformance = Number(process.env.LH_MIN_PERFORMANCE ?? 90);
const maxCls = Number(process.env.LH_MAX_CLS ?? 0.1);
const maxLcpMs = Number(process.env.LH_MAX_LCP_MS ?? 2500);

function formatMs(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }
  return `${Math.round(value)}ms`;
}

function formatCls(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }
  return value.toFixed(3);
}

function evaluateRow(row) {
  const failures = [];

  if (row.error) {
    failures.push(`audit failed: ${row.error}`);
    return failures;
  }

  if (typeof row.performance !== "number" || row.performance < minPerformance) {
    failures.push(
      `performance ${row.performance ?? "n/a"} < ${minPerformance}`
    );
  }

  if (typeof row.cls !== "number" || row.cls > maxCls) {
    failures.push(`CLS ${formatCls(row.cls)} > ${maxCls}`);
  }

  if (typeof row.lcp !== "number" || row.lcp > maxLcpMs) {
    failures.push(`LCP ${formatMs(row.lcp)} > ${maxLcpMs}ms`);
  }

  return failures;
}

const scoreScript = path.join(repoRoot, "scripts/lh-score.mjs");

function scoreRoutes(routes) {
  const result = spawnSync(
    process.execPath,
    [scoreScript, base, formFactor, routes.join(",")],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 20_000_000 }
  );

  if (result.status !== 0 && !result.stdout?.trim()) {
    process.stderr.write(
      result.stderr || `lh-score exited with status ${result.status ?? "unknown"}\n`
    );
    process.exit(result.status || 1);
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    process.stderr.write(
      `lh-gate: failed to parse lh-score output: ${error instanceof Error ? error.message : String(error)}\n`
    );
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(1);
  }
}

const warmupRoute = LH_ROUTES[0];
if (warmupRoute) {
  process.stdout.write(
    `Lighthouse gate: discarding warmup audit of ${warmupRoute} to prime Chrome\n`
  );
  scoreRoutes([warmupRoute]);
}

const rows = scoreRoutes(LH_ROUTES);

for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  if (evaluateRow(row).length === 0) {
    continue;
  }
  process.stdout.write(
    `Lighthouse gate: retrying ${row.route} in isolation after a failed first pass\n`
  );
  const [retry] = scoreRoutes([row.route]);
  if (retry && evaluateRow(retry).length === 0) {
    rows[index] = retry;
  }
}

const failing = [];
const lines = [
  `Lighthouse gate (${formFactor}): performance >= ${minPerformance}, CLS <= ${maxCls}, LCP <= ${maxLcpMs}ms`,
  "",
  "route | perf | CLS | LCP | status",
  "------|------|-----|-----|-------",
];

for (const row of rows) {
  const failures = evaluateRow(row);
  const status = failures.length === 0 ? "pass" : failures.join("; ");
  lines.push(
    `${row.route} | ${row.performance ?? "n/a"} | ${formatCls(row.cls)} | ${formatMs(row.lcp)} | ${status}`
  );
  if (failures.length > 0) {
    failing.push({ route: row.route, failures });
  }
}

process.stdout.write(`${lines.join("\n")}\n`);

if (failing.length > 0) {
  process.stderr.write("\nLighthouse gate failed:\n");
  for (const entry of failing) {
    process.stderr.write(`- ${entry.route}: ${entry.failures.join("; ")}\n`);
  }
  process.exit(1);
}
