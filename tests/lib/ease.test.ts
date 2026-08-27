import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  DURATION,
  EASE_DRAWER,
  EASE_IN_OUT,
  EASE_OUT,
  EASE_OUT_CSS,
  EASE_IN_OUT_CSS,
  EASE_SMOOTH_OUT,
  EASE_SMOOTH_OUT_CSS,
  SPRING_LAYOUT,
  SPRING_PANEL,
  SPRING_PRESS,
  SPRING_SWAP,
} from "../../src/lib/ease";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const globals = readFileSync(
  path.join(repoRoot, "src/app/globals.css"),
  "utf8"
);

function parseBezier(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  assert.ok(match, `missing ${name} in globals.css`);
  return match[1]!.trim();
}

function tupleToCss([a, b, c, d]: readonly [number, number, number, number]) {
  return `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
}

assert.equal(EASE_OUT_CSS, tupleToCss(EASE_OUT));
assert.equal(EASE_IN_OUT_CSS, tupleToCss(EASE_IN_OUT));
assert.equal(EASE_SMOOTH_OUT_CSS, tupleToCss(EASE_SMOOTH_OUT));
assert.equal(parseBezier(globals, "--pf-ease-out"), EASE_OUT_CSS);
assert.equal(parseBezier(globals, "--pf-ease-in-out"), EASE_IN_OUT_CSS);
assert.equal(parseBezier(globals, "--pf-ease-smooth-out"), EASE_SMOOTH_OUT_CSS);
assert.equal(parseBezier(globals, "--pf-ease-drawer"), tupleToCss(EASE_DRAWER));

assert.match(globals, /--t-duration-fast:\s*180ms/);
assert.equal(DURATION.fast, 180);
assert.equal(DURATION.instant, 100);
assert.equal(DURATION.normal, 220);
assert.equal(DURATION.moderate, 320);
assert.equal(DURATION.slow, 480);
assert.equal(SPRING_PRESS.stiffness, 500);
assert.equal(SPRING_LAYOUT.stiffness, 360);
assert.equal(SPRING_PANEL.stiffness, 420);
assert.equal(SPRING_SWAP.stiffness, 460);

console.log("ease JS/CSS parity passed");
