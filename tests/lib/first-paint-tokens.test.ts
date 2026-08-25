import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkFirstPaintTokens,
  CRITICAL_HEADINGS,
  extractFirstPaintCss,
  formatFirstPaintTokenViolations,
  readDesignHeadingSizes,
} from "../../scripts/check-first-paint-tokens";
import { VISUAL_REGRESSION_ROUTES } from "../../scripts/visual-regression-routes";

const clipped = `[data-home-title]{font-size:30px;max-width:8rem}`;
assert.equal(
  checkFirstPaintTokens({
    css: clipped,
    design: { display: "30px", headline: "28px" },
  }).some((item) => item.kind === "eight-rem-cap"),
  true
);

const healthy = `[data-home-title]{font-size:30px;max-width:12rem}#workspace-header-grid h1{font-size:28px;max-width:12rem}[data-character-title]{font-size:28px;max-width:12rem}.policy-heading{font-size:30px;max-width:12rem}`;
assert.deepEqual(
  checkFirstPaintTokens({
    css: healthy,
    design: { display: "30px", headline: "28px" },
  }),
  []
);

assert.match(
  formatFirstPaintTokenViolations([
    { kind: "eight-rem-cap", selector: "[data-home-title]" },
  ]),
  /8rem/
);

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const design = readDesignHeadingSizes(
  readFileSync(path.join(repoRoot, "DESIGN.md"), "utf8")
);
assert.equal(design.display, "30px");
assert.equal(design.headline, "28px");
assert.equal(CRITICAL_HEADINGS[0]?.fontSize, design.display);
assert.equal(CRITICAL_HEADINGS[1]?.fontSize, design.headline);

const css = extractFirstPaintCss(
  readFileSync(path.join(repoRoot, "src/app/first-paint-css.ts"), "utf8")
);
assert.deepEqual(checkFirstPaintTokens({ css, design }), []);

assert.equal(VISUAL_REGRESSION_ROUTES.length, 18);

const lhGate = readFileSync(path.join(repoRoot, "scripts/lh-gate.mjs"), "utf8");
const lhBoot = readFileSync(
  path.join(repoRoot, "scripts/kode-lighthouse.sh"),
  "utf8"
);
assert.match(lhGate, /check-first-paint-tokens/);
assert.match(lhBoot, /check-first-paint-tokens/);
assert.match(lhBoot, /visual-regression/);
