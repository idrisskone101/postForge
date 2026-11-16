import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PAGE_TITLE_SIZE = "28px";
export const FIRST_PAINT_BYTE_CAP = 1500;

/** Every rule that draws a workspace page title, and the stylesheet that owns it. */
export const PAGE_TITLE_RULES = [
  { selector: ".wb-page-title", file: "src/app/styles/shell.css" },
  { selector: ".pf-page-title", file: "src/app/styles/legacy.css" },
] as const;

export type FirstPaintTokenViolation =
  | { kind: "design-mismatch"; token: string; expected: string }
  | { kind: "missing-font"; selector: string; expected: string }
  | { kind: "inline-route-rule"; match: string }
  | { kind: "inline-too-large"; bytes: number }
  | { kind: "missing-theme-floor" };

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

function ruleBody(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|[\\s,}])${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  return match ? match[1] : null;
}

/**
 * The page title is 28px on every route and is styled by the blocking
 * stylesheet. The inline first-paint block stays a tiny theme floor: no route
 * or heading rules may be copied into it again.
 */
export function checkFirstPaintTokens(options: {
  firstPaintCss: string;
  titleSheets: Record<string, string>;
  design: { display: string; headline: string };
}): FirstPaintTokenViolation[] {
  const violations: FirstPaintTokenViolation[] = [];
  for (const token of ["display", "headline"] as const) {
    if (options.design[token] !== PAGE_TITLE_SIZE) {
      violations.push({ kind: "design-mismatch", token, expected: PAGE_TITLE_SIZE });
    }
  }

  for (const rule of PAGE_TITLE_RULES) {
    const body = ruleBody(options.titleSheets[rule.file] ?? "", rule.selector);
    if (!body || !new RegExp(`font-size:\\s*${PAGE_TITLE_SIZE}`).test(body)) {
      violations.push({
        kind: "missing-font",
        selector: rule.selector,
        expected: PAGE_TITLE_SIZE,
      });
    }
  }

  const routeRule = /\[data-[a-z-]+|#workspace-[a-z-]+|\bh[1-6]\b|content:\s*attr\(/.exec(
    options.firstPaintCss
  );
  if (routeRule) {
    violations.push({ kind: "inline-route-rule", match: routeRule[0] });
  }
  const bytes = Buffer.byteLength(options.firstPaintCss);
  if (bytes > FIRST_PAINT_BYTE_CAP) {
    violations.push({ kind: "inline-too-large", bytes });
  }
  if (!/html\.dark\{background:#141516/i.test(options.firstPaintCss)) {
    violations.push({ kind: "missing-theme-floor" });
  }
  return violations;
}

export function formatFirstPaintTokenViolations(
  violations: readonly FirstPaintTokenViolation[]
): string {
  const lines = ["First-paint tokens failed."];
  for (const violation of violations) {
    switch (violation.kind) {
      case "design-mismatch":
        lines.push(`DESIGN.md ${violation.token} must be ${violation.expected}`);
        break;
      case "missing-font":
        lines.push(`${violation.selector} must set font-size: ${violation.expected}`);
        break;
      case "inline-route-rule":
        lines.push(
          `inline first-paint CSS contains "${violation.match}"; route and heading rules belong in the stylesheet`
        );
        break;
      case "inline-too-large":
        lines.push(
          `inline first-paint CSS is ${violation.bytes} bytes (cap ${FIRST_PAINT_BYTE_CAP}); keep it to the theme floor and font faces`
        );
        break;
      case "missing-theme-floor":
        lines.push("inline first-paint CSS must paint the dark floor on html.dark");
        break;
      default: {
        const _exhaustive: never = violation;
        return _exhaustive;
      }
    }
  }
  return lines.join("\n");
}

export function readFirstPaintInputs(rootDir: string) {
  const read = (file: string) => readFileSync(path.join(rootDir, file), "utf8");
  return {
    firstPaintCss: extractFirstPaintCss(read("src/app/first-paint-css.ts")),
    titleSheets: Object.fromEntries(
      PAGE_TITLE_RULES.map((rule) => [rule.file, read(rule.file)])
    ),
    design: readDesignHeadingSizes(read("DESIGN.md")),
  };
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
  const violations = checkFirstPaintTokens(readFirstPaintInputs(rootDir));
  if (violations.length > 0) {
    console.error(formatFirstPaintTokenViolations(violations));
    process.exit(1);
  }
}

if (isCliEntry()) {
  main();
}
