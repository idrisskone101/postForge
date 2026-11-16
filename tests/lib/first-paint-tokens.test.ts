import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkFirstPaintTokens,
  FIRST_PAINT_BYTE_CAP,
  formatFirstPaintTokenViolations,
  PAGE_TITLE_RULES,
  PAGE_TITLE_SIZE,
  readFirstPaintInputs,
} from "../../scripts/check-first-paint-tokens";
import { VISUAL_REGRESSION_ROUTES } from "../../scripts/visual-regression-routes";

const design = { display: "28px", headline: "28px" };
const floor = `html{background:#EDEDEB}html.dark{background:#141516}`;
const titleSheets = {
  "src/app/styles/shell.css": `.wb-page-title {\n  font-size: 28px;\n}`,
  "src/app/styles/legacy.css": `.pf-page-title {\n  font-size: 28px;\n}`,
};
const kinds = (options: Parameters<typeof checkFirstPaintTokens>[0]) =>
  checkFirstPaintTokens(options).map((violation) => violation.kind);

assert.deepEqual(kinds({ firstPaintCss: floor, titleSheets, design }), []);

// The page title is 28px everywhere: DESIGN.md and every title rule agree.
assert.deepEqual(
  kinds({ firstPaintCss: floor, titleSheets, design: { display: "30px", headline: "28px" } }),
  ["design-mismatch"]
);
assert.deepEqual(
  kinds({
    firstPaintCss: floor,
    titleSheets: { ...titleSheets, "src/app/styles/shell.css": `.wb-page-title { font-size: 30px; }` },
    design,
  }),
  ["missing-font"]
);
assert.deepEqual(
  kinds({ firstPaintCss: floor, titleSheets: { "src/app/styles/legacy.css": titleSheets["src/app/styles/legacy.css"] }, design }),
  ["missing-font"]
);

// The inline block stays a theme floor: no copied route rules, no CSS-drawn text.
assert.deepEqual(
  kinds({ firstPaintCss: `${floor}[data-home-title]{font-size:30px}`, titleSheets, design }),
  ["inline-route-rule"]
);
assert.deepEqual(
  kinds({ firstPaintCss: `${floor}#workspace-header-grid h1{font-size:28px}`, titleSheets, design }),
  ["inline-route-rule"]
);
assert.deepEqual(
  kinds({ firstPaintCss: `${floor}${"a{color:red}".repeat(200)}`, titleSheets, design }),
  ["inline-too-large"]
);
assert.deepEqual(
  kinds({ firstPaintCss: `html{background:#EDEDEB}`, titleSheets, design }),
  ["missing-theme-floor"]
);
assert.match(
  formatFirstPaintTokenViolations([{ kind: "inline-route-rule", match: "[data-home-title" }]),
  /belong in the stylesheet/
);

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const inputs = readFirstPaintInputs(repoRoot);
assert.equal(inputs.design.display, PAGE_TITLE_SIZE);
assert.equal(inputs.design.headline, PAGE_TITLE_SIZE);
assert.equal(PAGE_TITLE_RULES.length, 2);
assert.ok(Buffer.byteLength(inputs.firstPaintCss) <= FIRST_PAINT_BYTE_CAP);
assert.deepEqual(checkFirstPaintTokens(inputs), []);

assert.equal(VISUAL_REGRESSION_ROUTES.length, 18);

const lhGate = readFileSync(path.join(repoRoot, "scripts/lh-gate.mjs"), "utf8");
const lhBoot = readFileSync(
  path.join(repoRoot, "scripts/kode-lighthouse.sh"),
  "utf8"
);
assert.match(lhGate, /check-first-paint-tokens/);
assert.match(lhBoot, /check-first-paint-tokens/);
assert.match(lhBoot, /visual-regression/);
const sweep = readFileSync(
  path.join(repoRoot, "scripts/visual-regression-sweep.ts"),
  "utf8"
);
assert.match(sweep, /pnpm/);
assert.match(sweep, /playwright/);
assert.doesNotMatch(sweep, /npx --yes playwright@/);

const spec = readFileSync(
  path.join(repoRoot, "scripts/visual-regression.spec.ts"),
  "utf8"
);
const visualConfig = readFileSync(
  path.join(repoRoot, "scripts/playwright.visual.config.ts"),
  "utf8"
);
assert.match(spec, /from "playwright\/test"/);
assert.match(visualConfig, /from "playwright\/test"/);
assert.doesNotMatch(spec, /@playwright\/test/);
assert.doesNotMatch(visualConfig, /@playwright\/test/);
assert.match(
  createRequire(import.meta.url).resolve("playwright/test"),
  /playwright/
);
