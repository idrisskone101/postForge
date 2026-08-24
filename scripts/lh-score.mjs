import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const formFactor = process.argv[3] ?? "desktop";
const routes = (process.argv[4] ?? "/")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

const outDir = path.resolve(".audit/lighthouse");
mkdirSync(outDir, { recursive: true });

const rows = [];

for (const route of routes) {
  const url = new URL(route, base).href;
  const slug = route === "/" ? "home" : route.replaceAll("/", "_").replace(/^_+/, "");
  const jsonPath = path.join(outDir, `${formFactor}-${slug}.json`);
  const result = spawnSync(
    "npx",
    [
      "--yes",
      "lighthouse",
      url,
      "--quiet",
      "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
      "--output=json",
      `--output-path=${jsonPath}`,
      `--form-factor=${formFactor}`,
      `--screenEmulation.mobile=${formFactor === "mobile"}`,
      "--only-categories=performance,accessibility,best-practices,seo",
    ],
    { encoding: "utf8", maxBuffer: 20_000_000 }
  );

  if (result.status !== 0) {
    rows.push({
      route,
      error: (result.stderr || result.stdout || `exit ${result.status}`).slice(0, 800),
    });
    continue;
  }

  const report = JSON.parse(readFileSync(jsonPath, "utf8"));
  const categories = report.categories ?? {};
  rows.push({
    route,
    performance: Math.round((categories.performance?.score ?? 0) * 100),
    accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((categories["best-practices"]?.score ?? 0) * 100),
    seo: Math.round((categories.seo?.score ?? 0) * 100),
    lcp: report.audits?.["largest-contentful-paint"]?.numericValue,
    tbt: report.audits?.["total-blocking-time"]?.numericValue,
    cls: report.audits?.["cumulative-layout-shift"]?.numericValue,
    failed: Object.values(report.audits ?? {})
      .filter((audit) => audit.score === 0 && audit.scoreDisplayMode === "binary")
      .map((audit) => audit.id),
  });
}

const summaryPath = path.join(outDir, `${formFactor}-summary.json`);
writeFileSync(summaryPath, `${JSON.stringify(rows, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
