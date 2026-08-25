import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkPrBoundaries,
  FILE_COUNT_CAP,
  formatPrBoundaryViolations,
  INSERTION_CAP,
  isRefactorUiSubject,
  isStorySubject,
  parseNumstat,
  REFACTOR_UI_FILE_CAP,
  STORY_COMMIT_MIN,
} from "../../scripts/check-pr-boundaries";
import { WORKSPACE_SMOKE_ROUTES } from "../../scripts/workspace-smoke-routes";

assert.equal(isStorySubject("feat(ui): add card"), true);
assert.equal(isStorySubject("refactor(ui): move files"), true);
assert.equal(isStorySubject("Merge pull request #122"), false);
assert.equal(isRefactorUiSubject("refactor(ui): move files"), true);
assert.equal(isRefactorUiSubject("feat(ui): add card"), false);

assert.deepEqual(
  checkPrBoundaries({
    subjects: [
      "feat(a): one",
      "feat(b): two",
      "fix(c): three",
      "chore: noise",
    ],
    filesChanged: FILE_COUNT_CAP + 1,
    insertions: 100,
  }),
  [
    {
      kind: "stacked-megadiff",
      storyCommits: STORY_COMMIT_MIN,
      filesChanged: FILE_COUNT_CAP + 1,
      insertions: 100,
    },
  ]
);

assert.deepEqual(
  checkPrBoundaries({
    subjects: ["feat(a): one", "feat(b): two"],
    filesChanged: 80,
    insertions: 4000,
  }),
  []
);

assert.deepEqual(
  checkPrBoundaries({
    subjects: ["refactor(ui): move files"],
    filesChanged: REFACTOR_UI_FILE_CAP + 1,
    insertions: 10,
  }),
  [{ kind: "refactor-ui", filesChanged: REFACTOR_UI_FILE_CAP + 1 }]
);

assert.deepEqual(
  parseNumstat("12\t3\tsrc/a.ts\n-\t-\tpic.png\n"),
  { filesChanged: 2, insertions: 12 }
);

assert.match(
  formatPrBoundaryViolations([
    {
      kind: "stacked-megadiff",
      storyCommits: 5,
      filesChanged: 80,
      insertions: 3166,
    },
  ]),
  /Split the stack/
);

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const kodeCheck = readFileSync(path.join(repoRoot, "scripts/kode-check.sh"), "utf8");
const kodeSmoke = readFileSync(path.join(repoRoot, "scripts/kode-smoke.sh"), "utf8");
const workflow = readFileSync(
  path.join(repoRoot, ".github/workflows/kode.yml"),
  "utf8"
);

assert.match(kodeCheck, /check-pr-boundaries/);
assert.match(kodeCheck, /KODE_SMOKE_ROUTES=1/);
assert.match(kodeSmoke, /WORKSPACE_SMOKE_ROUTES/);
assert.equal(WORKSPACE_SMOKE_ROUTES.length, 18);
assert.match(workflow, /fetch-depth:\s*0/);
assert.match(workflow, /KODE_BASE_REF/);
