import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const criticalPath = path.join(repoRoot, "src/app/dashboard-critical.css");
const outputPath = path.join(repoRoot, "src/app/first-paint-css.ts");
const marker = "/*dashboard-critical*/";

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

const output = await readFile(outputPath, "utf8");
const template = output.match(/export const FIRST_PAINT_CSS = `([\s\S]*)`;\s*$/);
if (!template) {
  throw new Error(`Could not parse ${path.relative(repoRoot, outputPath)}`);
}

const prefix = template[1].includes(marker)
  ? template[1].slice(0, template[1].indexOf(marker))
  : template[1];
if (prefix.includes("`")) {
  throw new Error("first-paint prefix contains a backtick");
}

const keepPattern =
  /data-generate-|data-home-glance|data-workspace-state|data-workspace-page|data-slideshow-|data-jobs-|data-gallery-|data-spend-|data-automation-|pf-content-viewport|:root|\.dark|\.sr-only|\.hidden|\.pf-button|\.pf-safe-overlay/;

function keepRule(block) {
  const selector = block.slice(0, block.indexOf("{"));
  return keepPattern.test(selector);
}

function filterCritical(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let out = "";
  let i = 0;
  while (i < stripped.length) {
    const at = stripped.indexOf("@media", i);
    const brace = stripped.indexOf("{", i);
    if (brace === -1) break;
    if (at !== -1 && at < brace) {
      const open = stripped.indexOf("{", at);
      let depth = 1;
      let j = open + 1;
      while (j < stripped.length && depth > 0) {
        if (stripped[j] === "{") depth += 1;
        else if (stripped[j] === "}") depth -= 1;
        j += 1;
      }
      const inner = stripped.slice(open + 1, j - 1);
      const keptInner = filterCritical(inner);
      if (keptInner) {
        out += stripped.slice(at, open + 1) + keptInner + "}";
      }
      i = j;
      continue;
    }
    let depth = 1;
    let j = brace + 1;
    while (j < stripped.length && depth > 0) {
      if (stripped[j] === "{") depth += 1;
      else if (stripped[j] === "}") depth -= 1;
      j += 1;
    }
    const block = stripped.slice(i, j);
    if (keepRule(block)) out += block;
    i = j;
  }
  return out;
}

const critical = minifyCss(filterCritical(await readFile(criticalPath, "utf8")));
if (critical.includes("`")) {
  throw new Error("minified dashboard-critical.css contains a backtick");
}

const css = `${prefix}${marker}${critical}`;
await writeFile(outputPath, `export const FIRST_PAINT_CSS = \`${css}\`;\n`);
process.stdout.write(
  `wrote ${path.relative(repoRoot, outputPath)} (${Buffer.byteLength(css)} bytes)\n`,
);
