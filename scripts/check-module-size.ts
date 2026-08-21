import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MODULE_SIZE_CAP = 400;

export type ModuleSizeViolation =
  | { kind: "over-cap"; path: string; lines: number }
  | { kind: "grew"; path: string; lines: number; allowed: number }
  | { kind: "missing"; path: string; allowed: number }
  | { kind: "stale"; path: string; lines: number; allowed: number };

function countWcLines(filePath: string): number {
  const bytes = readFileSync(filePath);
  let lines = 0;
  for (const byte of bytes) {
    if (byte === 10) {
      lines += 1;
    }
  }
  return lines;
}

function posixRel(rootDir: string, absPath: string): string {
  return path.relative(rootDir, absPath).split(path.sep).join("/");
}

function collectSrcModules(rootDir: string): Map<string, number> {
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
        if (relPath === "src/generated") {
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
      files.set(relPath, countWcLines(absPath));
    }
  };

  visit(srcDir);
  return files;
}

export function checkModuleSize(options: {
  rootDir: string;
  allowlist: Record<string, number>;
}): ModuleSizeViolation[] {
  const files = collectSrcModules(options.rootDir);
  const violations: ModuleSizeViolation[] = [];

  for (const [relPath, allowed] of Object.entries(options.allowlist)) {
    const lines = files.get(relPath);
    if (lines === undefined) {
      violations.push({ kind: "missing", path: relPath, allowed });
      continue;
    }
    if (lines <= MODULE_SIZE_CAP) {
      violations.push({ kind: "stale", path: relPath, lines, allowed });
      continue;
    }
    if (lines > allowed) {
      violations.push({ kind: "grew", path: relPath, lines, allowed });
    }
  }

  for (const [relPath, lines] of files) {
    if (Object.hasOwn(options.allowlist, relPath)) {
      continue;
    }
    if (lines > MODULE_SIZE_CAP) {
      violations.push({ kind: "over-cap", path: relPath, lines });
    }
  }

  violations.sort(
    (a, b) => a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind)
  );
  return violations;
}

function formatModuleSizeViolations(
  violations: readonly ModuleSizeViolation[]
): string {
  const lines = ["Module size check failed."];
  for (const violation of violations) {
    switch (violation.kind) {
      case "over-cap":
        lines.push(
          `${violation.path}: ${violation.lines} lines exceeds cap of ${MODULE_SIZE_CAP}`
        );
        break;
      case "grew":
        lines.push(
          `${violation.path}: ${violation.lines} lines exceeds allowlist of ${violation.allowed}`
        );
        break;
      case "missing":
        lines.push(
          `${violation.path}: allowlisted at ${violation.allowed} but file is missing`
        );
        break;
      case "stale":
        lines.push(
          `${violation.path}: ${violation.lines} lines is at or under cap of ${MODULE_SIZE_CAP}; remove from allowlist`
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
  const allowlistPath = path.join(rootDir, "scripts", "module-size-allowlist.json");
  const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8")) as Record<
    string,
    number
  >;
  const violations = checkModuleSize({ rootDir, allowlist });
  if (violations.length > 0) {
    console.error(formatModuleSizeViolations(violations));
    process.exit(1);
  }
}

if (isCliEntry()) {
  main();
}
