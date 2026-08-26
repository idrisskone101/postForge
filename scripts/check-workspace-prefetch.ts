import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PRIMARY_NAV_FILES = [
  "src/components/sidebar.tsx",
  "src/components/workspace-header-gate.tsx",
] as const;

export const PREFETCH_OFF_REASON = /prefetch-off:/;

export type PrefetchViolation = {
  path: string;
  line: number;
};

export function findUndocumentedPrefetchOff(
  relPath: string,
  source: string
): PrefetchViolation[] {
  const lines = source.split("\n");
  const violations: PrefetchViolation[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/prefetch=\{false\}/.test(lines[index])) {
      continue;
    }
    const nearby = [
      lines[index - 1] ?? "",
      lines[index],
      lines[index + 1] ?? "",
    ].join("\n");
    if (PREFETCH_OFF_REASON.test(nearby)) {
      continue;
    }
    violations.push({ path: relPath, line: index + 1 });
  }
  return violations;
}

export function checkWorkspacePrefetch(options: {
  rootDir: string;
}): PrefetchViolation[] {
  return PRIMARY_NAV_FILES.flatMap((relPath) => {
    const source = readFileSync(path.join(options.rootDir, relPath), "utf8");
    return findUndocumentedPrefetchOff(relPath, source);
  });
}

export function formatPrefetchViolations(
  violations: readonly PrefetchViolation[]
): string {
  const lines = [
    "Primary nav prefetch={false} needs a prefetch-off: reason on the same line or a neighbor.",
  ];
  for (const violation of violations) {
    lines.push(`${violation.path}:${violation.line}`);
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
  const violations = checkWorkspacePrefetch({ rootDir });
  if (violations.length > 0) {
    console.error(formatPrefetchViolations(violations));
    process.exit(1);
  }
}

if (isCliEntry()) {
  main();
}
