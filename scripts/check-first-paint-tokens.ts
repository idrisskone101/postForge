import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type HeadingToken = {
  selector: string;
  fontSize: string;
  minMaxWidth: string;
};

export const CRITICAL_HEADINGS: HeadingToken[] = [
  { selector: "[data-home-title]", fontSize: "30px", minMaxWidth: "12rem" },
  { selector: "#workspace-header-grid h1", fontSize: "28px", minMaxWidth: "12rem" },
  { selector: "[data-character-title]", fontSize: "28px", minMaxWidth: "12rem" },
  { selector: ".policy-heading", fontSize: "30px", minMaxWidth: "12rem" },
];

export type FirstPaintTokenViolation =
  | { kind: "design-mismatch"; token: string; expected: string }
  | { kind: "missing-font"; selector: string; expected: string }
  | { kind: "eight-rem-cap"; selector: string }
  | { kind: "narrow-max-width"; selector: string; maxWidth: string };

const EIGHT_REM = /max-width:\s*8rem/;

export function readDesignHeadingSizes(designMarkdown: string): {
  display: string;
  headline: string;
} {
  const display = /typography:\s*\n\s*display:[\s\S]*?fontSize:\s*"(\d+px)"/.exec(
    designMarkdown
  );
  const headline = /headline:\s*\n\s*fontFamily:[\s\S]*?fontSize:\s*"(\d+px)"/.exec(
    designMarkdown
  );
  if (!display || !headline) {
    throw new Error("DESIGN.md is missing display or headline fontSize");
  }
  return { display: display[1], headline: headline[1] };
}

export function extractFirstPaintCss(moduleSource: string): string {
  const match = /export const FIRST_PAINT_CSS = `([\s\S]*)`;/.exec(moduleSource);
  if (!match) {
    throw new Error("Could not parse FIRST_PAINT_CSS");
  }
  return match[1];
}

function ruleBodiesForSelector(css: string, selector: string): string[] {
  const bodies: string[] = [];
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?:^|[,{}])\\s*${escaped}\\s*(?:,[^{]*)?\\{([^}]*)\\}`,
    "g"
  );
  for (const match of css.matchAll(pattern)) {
    bodies.push(match[1] ?? "");
  }
  return bodies;
}

export function checkFirstPaintTokens(options: {
  css: string;
  design: { display: string; headline: string };
}): FirstPaintTokenViolation[] {
  const violations: FirstPaintTokenViolation[] = [];
  if (options.design.display !== "30px") {
    violations.push({
      kind: "design-mismatch",
      token: "display",
      expected: "30px",
    });
  }
  if (options.design.headline !== "28px") {
    violations.push({
      kind: "design-mismatch",
      token: "headline",
      expected: "28px",
    });
  }

  for (const heading of CRITICAL_HEADINGS) {
    const bodies = ruleBodiesForSelector(options.css, heading.selector);
    const joined = bodies.join(";");
    if (!joined.includes(`font-size:${heading.fontSize}`)) {
      violations.push({
        kind: "missing-font",
        selector: heading.selector,
        expected: heading.fontSize,
      });
    }
    if (EIGHT_REM.test(joined)) {
      violations.push({ kind: "eight-rem-cap", selector: heading.selector });
    }
    const maxWidth = /max-width:\s*([0-9.]+rem)/.exec(joined);
    if (maxWidth && Number.parseFloat(maxWidth[1]) < 12) {
      violations.push({
        kind: "narrow-max-width",
        selector: heading.selector,
        maxWidth: maxWidth[1],
      });
    }
  }
  return violations;
}

export function formatFirstPaintTokenViolations(
  violations: readonly FirstPaintTokenViolation[]
): string {
  const lines = ["First-paint heading tokens failed."];
  for (const violation of violations) {
    switch (violation.kind) {
      case "design-mismatch":
        lines.push(
          `DESIGN.md ${violation.token} must be ${violation.expected}`
        );
        break;
      case "missing-font":
        lines.push(
          `${violation.selector} must set font-size:${violation.expected}`
        );
        break;
      case "eight-rem-cap":
        lines.push(
          `${violation.selector} uses max-width:8rem; critical headings follow DESIGN.md, not an LCP clip`
        );
        break;
      case "narrow-max-width":
        lines.push(
          `${violation.selector} max-width ${violation.maxWidth} is tighter than 12rem`
        );
        break;
      default: {
        const _exhaustive: never = violation;
        return _exhaustive;
      }
    }
  }
  return lines.join("\n");
}

function isCliEntry(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

function main(): void {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const css = extractFirstPaintCss(
    readFileSync(path.join(rootDir, "src/app/first-paint-css.ts"), "utf8")
  );
  const design = readDesignHeadingSizes(
    readFileSync(path.join(rootDir, "DESIGN.md"), "utf8")
  );
  const violations = checkFirstPaintTokens({ css, design });
  if (violations.length > 0) {
    console.error(formatFirstPaintTokenViolations(violations));
    process.exit(1);
  }
}

if (isCliEntry()) {
  main();
}
