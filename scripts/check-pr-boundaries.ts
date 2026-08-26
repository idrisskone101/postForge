import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const STORY_COMMIT_MIN = 3;
export const FILE_COUNT_CAP = 40;
export const INSERTION_CAP = 2000;
export const REFACTOR_UI_FILE_CAP = 20;

const STORY_SUBJECT = /^(feat|fix|refactor|perf)(\([^)]+\))?(!)?:/;
const REFACTOR_UI_SUBJECT = /^refactor\(ui\)/;

export type PrBoundaryInput = {
  subjects: string[];
  filesChanged: number;
  insertions: number;
};

export type PrBoundaryViolation =
  | {
      kind: "stacked-megadiff";
      storyCommits: number;
      filesChanged: number;
      insertions: number;
    }
  | {
      kind: "refactor-ui";
      filesChanged: number;
    };

export function isStorySubject(subject: string): boolean {
  return STORY_SUBJECT.test(subject.trim());
}

export function isRefactorUiSubject(subject: string): boolean {
  return REFACTOR_UI_SUBJECT.test(subject.trim());
}

export function checkPrBoundaries(
  input: PrBoundaryInput
): PrBoundaryViolation[] {
  const violations: PrBoundaryViolation[] = [];
  const storyCommits = input.subjects.filter(isStorySubject).length;
  const stacked =
    storyCommits >= STORY_COMMIT_MIN &&
    (input.filesChanged > FILE_COUNT_CAP || input.insertions > INSERTION_CAP);
  if (stacked) {
    violations.push({
      kind: "stacked-megadiff",
      storyCommits,
      filesChanged: input.filesChanged,
      insertions: input.insertions,
    });
  }
  if (
    input.subjects.some(isRefactorUiSubject) &&
    input.filesChanged > REFACTOR_UI_FILE_CAP
  ) {
    violations.push({
      kind: "refactor-ui",
      filesChanged: input.filesChanged,
    });
  }
  return violations;
}

export function formatPrBoundaryViolations(
  violations: readonly PrBoundaryViolation[]
): string {
  const lines = ["PR boundary check failed."];
  for (const violation of violations) {
    switch (violation.kind) {
      case "stacked-megadiff":
        lines.push(
          `${violation.storyCommits} story commits changed ${violation.filesChanged} files / +${violation.insertions} lines. Split the stack. Caps are ${STORY_COMMIT_MIN} commits and ${FILE_COUNT_CAP} files or +${INSERTION_CAP}.`
        );
        break;
      case "refactor-ui":
        lines.push(
          `refactor(ui) changed ${violation.filesChanged} files (cap ${REFACTOR_UI_FILE_CAP}). kode:check must run production route smoke.`
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

export function parseNumstat(numstat: string): {
  filesChanged: number;
  insertions: number;
} {
  let filesChanged = 0;
  let insertions = 0;
  for (const line of numstat.split("\n")) {
    const match = /^(\d+|-)\t(\d+|-)\t/.exec(line);
    if (!match) {
      continue;
    }
    filesChanged += 1;
    if (match[1] !== "-") {
      insertions += Number.parseInt(match[1], 10);
    }
  }
  return { filesChanged, insertions };
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function resolveBaseRef(): string | null {
  if (process.env.KODE_SKIP_PR_BOUNDARIES === "1") {
    return null;
  }
  const requested = process.env.KODE_BASE_REF ?? "origin/main";
  try {
    const head = git(["rev-parse", "--abbrev-ref", "HEAD"]);
    if (head === "main") {
      return null;
    }
    git(["rev-parse", "--verify", requested]);
    return requested;
  } catch {
    return null;
  }
}

function main(): void {
  const base = resolveBaseRef();
  if (!base) {
    console.log("pr-boundaries: skip (main, missing base, or KODE_SKIP_PR_BOUNDARIES=1)");
    return;
  }

  const subjects = git(["log", "--format=%s", `${base}..HEAD`])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const { filesChanged, insertions } = parseNumstat(
    git(["diff", "--numstat", `${base}...HEAD`])
  );
  const violations = checkPrBoundaries({
    subjects,
    filesChanged,
    insertions,
  });
  const refactorOnly = violations.every((item) => item.kind === "refactor-ui");
  if (violations.length === 0) {
    console.log(
      `pr-boundaries: ok (${subjects.length} commits, ${filesChanged} files, +${insertions})`
    );
    return;
  }
  if (refactorOnly && process.env.KODE_SMOKE_ROUTES === "1") {
    console.log(
      `pr-boundaries: refactor(ui) ${filesChanged} files; route smoke is on`
    );
    return;
  }
  console.error(formatPrBoundaryViolations(violations));
  process.exit(1);
}

function isCliEntry(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isCliEntry()) {
  main();
}
