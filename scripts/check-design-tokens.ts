import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MEDIA_STAGE_HEX = /^#09090B$/i;

const DESIGN_MD_SKIP_PATHS = new Set([
  "src/app/(app)/automations/new/playbook-model.ts",
  "src/components/slideshow/slide-preview.tsx",
  "src/lib/ai/slideshow-render-background.ts",
  "src/lib/slideshow/text-overlay.ts",
]);

const SKIP_DIRS = new Set(["src/generated", "src/components/ui"]);
const FIRST_PAINT_DUMPS = new Set([
  "src/app/first-paint-css.ts",
  "src/app/legal-first-paint-css.ts",
]);

export type DesignTokenViolation =
  | { kind: "over-cap"; path: string; count: number }
  | { kind: "grew"; path: string; count: number; allowed: number }
  | { kind: "missing"; path: string; allowed: number }
  | { kind: "stale"; path: string; count: number; allowed: number };

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

export function findForbiddenHex(source: string): string[] {
  return [...source.matchAll(/#(?:[0-9A-Fa-f]{3,8})\b/g)]
    .map((match) => match[0])
    .filter((value) => !MEDIA_STAGE_HEX.test(value));
}

function posixRel(rootDir: string, absPath: string): string {
  return path.relative(rootDir, absPath).split(path.sep).join("/");
}

function isExemptPath(relPath: string): boolean {
  return FIRST_PAINT_DUMPS.has(relPath) || DESIGN_MD_SKIP_PATHS.has(relPath);
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
        if (SKIP_DIRS.has(relPath)) {
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

function formatDesignTokenViolations(
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

function isCliEntry(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

function main(): void {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const allowlistPath = path.join(
    rootDir,
    "scripts",
    "design-token-allowlist.json"
  );
  const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8")) as Record<
    string,
    number
  >;
  const violations = checkDesignTokens({ rootDir, allowlist });
  if (violations.length > 0) {
    console.error(formatDesignTokenViolations(violations));
    process.exit(1);
  }
}

if (isCliEntry()) {
  main();
}
