import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import {
  checkKodeTaste,
  collectReactModules,
  findFileLayoutIssue,
  loadKodeTasteAllowlist,
  type KodeTasteViolation,
} from "../../scripts/check-kode-taste";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

type DetectorViolation = Exclude<
  KodeTasteViolation,
  { kind: "stale-allowlist" } | { kind: "missing-allowlist" }
>;

function violationKey(violation: DetectorViolation): string {
  switch (violation.kind) {
    case "file-layout":
      return `${violation.path}|file-layout|${violation.exportName}|${violation.exportLine}`;
    case "prop-bag":
      return `${violation.path}|prop-bag|${violation.component}`;
    case "use-state":
      return `${violation.path}|use-state|${violation.count}`;
    case "use-effect":
      return `${violation.path}|use-effect|${violation.count}`;
    case "inner-html":
      return `${violation.path}|inner-html`;
    case "hook-size":
      return `${violation.path}|hook-size|${violation.lines}`;
    case "effect-fn":
      return `${violation.path}|effect-fn|${violation.name}|${violation.line}`;
    default: {
      const exhaustive: never = violation;
      return exhaustive;
    }
  }
}

function ruleIdToKind(ruleId: string): DetectorViolation["kind"] {
  switch (ruleId) {
    case "kode-taste/file-layout":
      return "file-layout";
    case "kode-taste/prop-bags":
      return "prop-bag";
    case "kode-taste/use-state":
      return "use-state";
    case "kode-taste/use-effect":
      return "use-effect";
    case "kode-taste/inner-html":
      return "inner-html";
    case "kode-taste/hook-size":
      return "hook-size";
    case "kode-taste/effect-fns":
      return "effect-fn";
    default:
      throw new Error(`unexpected kode-taste rule: ${ruleId}`);
  }
}

function eslintMessageKey(
  relPath: string,
  ruleId: string,
  message: string,
  line: number
): string {
  const kind = ruleIdToKind(ruleId);
  switch (kind) {
    case "file-layout": {
      const match = message.match(
        /^(.+) is exported at line (\d+) after helper at line \d+$/
      );
      assert.ok(match, `unexpected file-layout message: ${message}`);
      return `${relPath}|file-layout|${match[1]}|${match[2]}`;
    }
    case "prop-bag": {
      const match = message.match(/^(.+) takes \d+ props/);
      assert.ok(match, `unexpected prop-bag message: ${message}`);
      return `${relPath}|prop-bag|${match[1]}`;
    }
    case "use-state": {
      const match = message.match(/^(\d+) useState calls/);
      assert.ok(match, `unexpected use-state message: ${message}`);
      return `${relPath}|use-state|${match[1]}`;
    }
    case "use-effect": {
      const match = message.match(/^(\d+) useEffect calls/);
      assert.ok(match, `unexpected use-effect message: ${message}`);
      return `${relPath}|use-effect|${match[1]}`;
    }
    case "inner-html":
      return `${relPath}|inner-html`;
    case "hook-size": {
      const match = message.match(/^hook module is (\d+) lines/);
      assert.ok(match, `unexpected hook-size message: ${message}`);
      return `${relPath}|hook-size|${match[1]}`;
    }
    case "effect-fn": {
      const match = message.match(/^(.+) is declared inside useEffect/);
      assert.ok(match, `unexpected effect-fn message: ${message}`);
      return `${relPath}|effect-fn|${match[1]}|${line}`;
    }
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

const allowlist = loadKodeTasteAllowlist(repoRoot);
const emptyAllowlist: typeof allowlist = {
  fileLayout: [],
  propBags: [],
  useState: [],
  useEffect: [],
  innerHtml: [],
  hookSize: [],
  effectFns: [],
};

const emptyRuleOptions: ["error", { allowlist: string[] }] = [
  "error",
  { allowlist: [] },
];

function checkerKeysFor(
  violations: KodeTasteViolation[]
): Set<string> {
  return new Set(
    violations
      .filter(
        (item): item is DetectorViolation =>
          item.kind !== "stale-allowlist" && item.kind !== "missing-allowlist"
      )
      .map(violationKey)
  );
}

async function eslintKeysFor(eslint: ESLint, files: string[]): Promise<Set<string>> {
  const results = await eslint.lintFiles(files);
  const eslintKeys = new Set<string>();
  for (const result of results) {
    const relPath = path
      .relative(repoRoot, result.filePath)
      .split(path.sep)
      .join("/");
    for (const message of result.messages) {
      if (!message.ruleId?.startsWith("kode-taste/")) {
        continue;
      }
      eslintKeys.add(
        eslintMessageKey(relPath, message.ruleId, message.message, message.line)
      );
    }
  }
  return eslintKeys;
}

function assertSameKeys(checkerKeys: Set<string>, eslintKeys: Set<string>): void {
  const onlyInChecker = [...checkerKeys].filter((key) => !eslintKeys.has(key));
  const onlyInEslint = [...eslintKeys].filter((key) => !checkerKeys.has(key));
  assert.deepEqual(
    onlyInChecker,
    [],
    `checker-only violations: ${onlyInChecker.join(", ")}`
  );
  assert.deepEqual(
    onlyInEslint,
    [],
    `eslint-only violations: ${onlyInEslint.join(", ")}`
  );
}

async function runParity(): Promise<void> {
  const files = collectReactModules(repoRoot).map((relPath) =>
    path.join(repoRoot, relPath)
  );

  const allowlistedEslint = new ESLint({ cwd: repoRoot });
  assertSameKeys(
    checkerKeysFor(checkKodeTaste({ rootDir: repoRoot, allowlist })),
    await eslintKeysFor(allowlistedEslint, files)
  );

  const emptyCheckerKeys = checkerKeysFor(
    checkKodeTaste({ rootDir: repoRoot, allowlist: emptyAllowlist })
  );
  assert.ok(
    emptyCheckerKeys.size >= 70,
    `expected a populated empty-allowlist scan, got ${emptyCheckerKeys.size}`
  );

  const emptyEslint = new ESLint({
    cwd: repoRoot,
    overrideConfig: [
      {
        files: ["src/**/*.{ts,tsx}"],
        ignores: ["src/generated/**", "src/components/ui/**"],
        rules: {
          "kode-taste/file-layout": emptyRuleOptions,
          "kode-taste/prop-bags": emptyRuleOptions,
          "kode-taste/use-state": emptyRuleOptions,
          "kode-taste/use-effect": emptyRuleOptions,
          "kode-taste/inner-html": emptyRuleOptions,
          "kode-taste/hook-size": emptyRuleOptions,
          "kode-taste/effect-fns": emptyRuleOptions,
        },
      },
    ],
  });
  assertSameKeys(emptyCheckerKeys, await eslintKeysFor(emptyEslint, files));

  const unsafeMarkup = `export function Markup() {
  return <div dangerouslySetInnerHTML={{ __html: "<b>hi</b>" }} />;
}
`;
  const fixturePath = path.join(
    repoRoot,
    "src/__kode-taste-eslint-fixture__.tsx"
  );
  const fixtureResults = await allowlistedEslint.lintText(unsafeMarkup, {
    filePath: fixturePath,
  });
  const fixtureMessages = fixtureResults.flatMap((result) => result.messages);
  assert.equal(
    fixtureMessages.some((message) => message.ruleId === "kode-taste/inner-html"),
    true
  );
  assert.match(
    fixtureMessages.find((message) => message.ruleId === "kode-taste/inner-html")
      ?.message ?? "",
    /dangerouslySetInnerHTML is banned/
  );

  const helperFirst = `function glyph() {
  return 1;
}

export function Card() {
  return <h1 />;
}
`;
  const layoutPath = path.join(repoRoot, "src/__kode-taste-layout-fixture__.tsx");
  const layoutLint = await allowlistedEslint.lintText(helperFirst, {
    filePath: layoutPath,
  });
  assert.equal(
    layoutLint
      .flatMap((result) => result.messages)
      .some((message) => message.ruleId === "kode-taste/file-layout"),
    true
  );

  const fixingEslint = new ESLint({ cwd: repoRoot, fix: true });
  const layoutFix = await fixingEslint.lintText(helperFirst, {
    filePath: layoutPath,
  });
  const fixed = layoutFix[0]?.output;
  assert.ok(fixed);
  assert.equal(
    findFileLayoutIssue("src/__kode-taste-layout-fixture__.tsx", fixed),
    null
  );

  console.log(
    `kode-taste eslint parity: ${emptyCheckerKeys.size} empty-allowlist findings match checkKodeTaste; inner-html and file-layout fixtures report`
  );
}

runParity().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
