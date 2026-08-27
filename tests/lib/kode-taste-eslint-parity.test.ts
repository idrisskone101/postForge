import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import {
  checkKodeTaste,
  collectReactModules,
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
const checkerViolations = checkKodeTaste({ rootDir: repoRoot, allowlist }).filter(
  (item): item is DetectorViolation =>
    item.kind !== "stale-allowlist" && item.kind !== "missing-allowlist"
);
const checkerKeys = new Set(checkerViolations.map(violationKey));

async function runParity(): Promise<void> {
  const eslint = new ESLint({ cwd: repoRoot });
  const files = collectReactModules(repoRoot);
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

  const unsafeMarkup = `export function Markup() {
  return <div dangerouslySetInnerHTML={{ __html: "<b>hi</b>" }} />;
}
`;
  const fixturePath = path.join(
    repoRoot,
    "src/__kode-taste-eslint-fixture__.tsx"
  );
  const fixtureResults = await eslint.lintText(unsafeMarkup, {
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

  console.log(
    `kode-taste eslint parity: ${checkerKeys.size} findings match checkKodeTaste; inner-html fixture reports kode-taste/inner-html`
  );
}

runParity().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
