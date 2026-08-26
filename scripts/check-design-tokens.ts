import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** CSS hex colors: 3, 4, 6, or 8 digits. */
export const HEX_COLOR_PATTERN = /#(?:[0-9A-Fa-f]{3,8})\b/g;

/** DESIGN.md dark media stage — the one accepted chrome literal. */
export const MEDIA_STAGE_HEX = /^#09090B$/i;

/**
 * DESIGN.md content palettes (not chrome): slide-theme maps and TEMPLATE_VISUALS.
 * These files may add hex when a palette grows.
 */
export const DESIGN_MD_EXCEPTION_PATHS = new Set([
  "src/app/(app)/automations/new/playbook-model.ts",
  "src/components/slideshow/slide-preview.tsx",
  "src/lib/ai/slideshow-render-background.ts",
  "src/lib/slideshow/text-overlay.ts",
]);

const GENERATED_PREFIX = "src/generated/";
const UI_PREFIX = "src/components/ui/";

/** Generated CSS dumps, not component code. Do not restyle; skip like globals.css. */
const FIRST_PAINT_PATHS = new Set([
  "src/app/first-paint-css.ts",
  "src/app/legal-first-paint-css.ts",
]);

export type DesignTokenViolation =
  | { kind: "over-cap"; path: string; count: number }
  | { kind: "grew"; path: string; count: number; allowed: number }
  | { kind: "missing"; path: string; allowed: number }
  | { kind: "stale"; path: string; count: number; allowed: number };

function posixRel(rootDir: string, absPath: string): string {
  return path.relative(rootDir, absPath).split(path.sep).join("/");
}

export function isExemptPath(relPath: string): boolean {
  return (
    relPath.startsWith(GENERATED_PREFIX) ||
    relPath.startsWith(UI_PREFIX) ||
    FIRST_PAINT_PATHS.has(relPath) ||
    DESIGN_MD_EXCEPTION_PATHS.has(relPath)
  );
}

export function findForbiddenHex(source: string): string[] {
  const matches = source.match(new RegExp(HEX_COLOR_PATTERN, "g")) ?? [];
  return matches.filter((value) => !MEDIA_STAGE_HEX.test(value));
}

function collectSrcHexCounts(rootDir: string): Map<string, number> {
  const srcDir = path.join(rootDir, "src");
  const files = new Map<string, number>();
  if (!existsSync(srcDir)) {
    return files;
  }

  const visit = (dir: string): void => {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      const relPath = posixRel(rootDir, absPath);
      if (entry.isDirectory()) {
        if (relPath === "src/generated" || relPath === "src/components/ui") {
          continue;
        }
        visit(absPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (!relPath.endsWith(".ts") && !relPath.endsWith(".tsx")) {
        continue;
      }
      if (isExemptPath(relPath)) {
        continue;
      }
      files.set(relPath, findForbiddenHex(readFileSync(absPath, "utf8")).length);
    }
  };

  visit(srcDir);
  return files;
}

export function checkDesignTokens(options: {
  rootDir: string;
  allowlist: Record<string, number>;
}): DesignTokenViolation[] {
  const files = collectSrcHexCounts(options.rootDir);
  const violations: DesignTokenViolation[] = [];

  for (const [relPath, allowed] of Object.entries(options.allowlist)) {
    const count = files.get(relPath);
    if (count === undefined) {
      violations.push({ kind: "missing", path: relPath, allowed });
      continue;
    }
    if (count === 0) {
      violations.push({ kind: "stale", path: relPath, count, allowed });
      continue;
    }
    if (count > allowed) {
      violations.push({ kind: "grew", path: relPath, count, allowed });
    }
  }

  for (const [relPath, count] of files) {
    if (Object.hasOwn(options.allowlist, relPath)) {
      continue;
    }
    if (count > 0) {
      violations.push({ kind: "over-cap", path: relPath, count });
    }
  }

  violations.sort(
    (left, right) =>
      left.path.localeCompare(right.path) || left.kind.localeCompare(right.kind)
  );
  return violations;
}

export function formatDesignTokenViolations(
  violations: readonly DesignTokenViolation[]
): string {
  const lines = ["Design-token hex check failed."];
  for (const violation of violations) {
    switch (violation.kind) {
      case "over-cap":
        lines.push(
          `${violation.path}: ${violation.count} literal hex color(s); DESIGN.md forbids new hex in component code`
        );
        break;
      case "grew":
        lines.push(
          `${violation.path}: ${violation.count} literal hex colors exceeds allowlist of ${violation.allowed}`
        );
        break;
      case "missing":
        lines.push(
          `${violation.path}: allowlisted at ${violation.allowed} but file is missing`
        );
        break;
      case "stale":
        lines.push(
          `${violation.path}: 0 literal hex colors; remove from allowlist`
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

export function loadDesignTokenAllowlist(rootDir: string): Record<string, number> {
  const allowlistPath = path.join(
    rootDir,
    "scripts",
    "design-token-allowlist.json"
  );
  if (!existsSync(allowlistPath)) {
    return {};
  }
  return JSON.parse(readFileSync(allowlistPath, "utf8")) as Record<
    string,
    number
  >;
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
  const allowlist = loadDesignTokenAllowlist(rootDir);
  const violations = checkDesignTokens({ rootDir, allowlist });
  if (violations.length > 0) {
    console.error(formatDesignTokenViolations(violations));
    process.exit(1);
  }
}

if (isCliEntry()) {
  main();
}
