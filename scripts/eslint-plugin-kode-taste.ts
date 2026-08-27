import path from "node:path";
import type { Rule } from "eslint";
import {
  USE_EFFECT_LIMIT,
  USE_STATE_LIMIT,
  HOOK_MODULE_LINE_CAP,
  findEffectInnerFns,
  findFileLayoutIssue,
  findHookPressure,
  findHookSize,
  findInnerHtml,
  findPropBags,
  loadKodeTasteAllowlist,
  reorderMainExport,
  type KodeTasteAllowlist,
  type KodeTasteAllowlistRule,
  type KodeTasteViolation,
} from "./check-kode-taste";

type DetectorViolation = Exclude<
  KodeTasteViolation,
  { kind: "stale-allowlist" } | { kind: "missing-allowlist" }
>;

let cachedAllowlist: KodeTasteAllowlist | null = null;
let cachedCwd: string | null = null;

function getAllowlist(cwd: string): KodeTasteAllowlist {
  if (cachedCwd !== cwd) {
    cachedAllowlist = loadKodeTasteAllowlist(cwd);
    cachedCwd = cwd;
  }
  return cachedAllowlist ?? loadKodeTasteAllowlist(cwd);
}

function posixRel(cwd: string, filename: string): string {
  return path.relative(cwd, filename).split(path.sep).join("/");
}

function optionAllowlist(raw: unknown): string[] | undefined {
  if (!raw || typeof raw !== "object" || !("allowlist" in raw)) {
    return undefined;
  }
  const listed = raw.allowlist;
  if (!Array.isArray(listed)) {
    return undefined;
  }
  if (listed.some((item) => typeof item !== "string")) {
    return undefined;
  }
  return listed;
}

function listedPaths(
  allowlist: KodeTasteAllowlist,
  rule: KodeTasteAllowlistRule,
  optionPaths: string[] | undefined
): readonly string[] {
  if (optionPaths) {
    return optionPaths;
  }
  return allowlist[rule];
}

function violationMessage(violation: DetectorViolation): string {
  switch (violation.kind) {
    case "file-layout":
      return `${violation.exportName} is exported at line ${violation.exportLine} after helper at line ${violation.firstHelperLine}`;
    case "prop-bag":
      return `${violation.component} takes ${violation.props.length} props (${violation.props.join(", ")}); pass a named view-model, or a feature-root Context when the same bag is threaded through layers`;
    case "use-state":
      return `${violation.count} useState calls (limit ${USE_STATE_LIMIT})`;
    case "use-effect":
      return `${violation.count} useEffect calls (limit ${USE_EFFECT_LIMIT})`;
    case "inner-html":
      return "dangerouslySetInnerHTML is banned; render React nodes or text instead";
    case "hook-size":
      return `hook module is ${violation.lines} lines (cap ${HOOK_MODULE_LINE_CAP}); split by domain, not by line count`;
    case "effect-fn":
      return `${violation.name} is declared inside useEffect; hoist it or keep only listener/cleanup arrows`;
    default: {
      const exhaustive: never = violation;
      return exhaustive;
    }
  }
}

function violationLoc(
  violation: DetectorViolation
): { line: number; column: number } {
  switch (violation.kind) {
    case "file-layout":
      return { line: violation.exportLine, column: 0 };
    case "effect-fn":
      return { line: violation.line, column: 0 };
    default:
      return { line: 1, column: 0 };
  }
}

function normalizeFindings(
  findings:
    | DetectorViolation
    | DetectorViolation[]
    | null
    | undefined
): DetectorViolation[] {
  if (!findings) {
    return [];
  }
  return Array.isArray(findings) ? findings : [findings];
}

function createKodeTasteRule(options: {
  allowlistRule: KodeTasteAllowlistRule;
  run: (
    relPath: string,
    source: string
  ) => DetectorViolation | DetectorViolation[] | null;
  tsxOnly?: boolean;
  fixable?: boolean;
}): Rule.RuleModule {
  return {
    meta: {
      type: "problem",
      schema: [
        {
          type: "object",
          properties: {
            allowlist: {
              type: "array",
              items: { type: "string" },
            },
          },
          additionalProperties: false,
        },
      ],
      ...(options.fixable ? { fixable: "code" as const } : {}),
    },
    create(context) {
      const cwd = context.cwd ?? process.cwd();
      const allowlist = getAllowlist(cwd);
      const optionPaths = optionAllowlist(context.options[0]);

      return {
        Program(node) {
          const filename = context.filename;
          if (!filename || filename === "<input>" || filename === "<text>") {
            return;
          }
          const relPath = posixRel(cwd, filename);
          if (options.tsxOnly && !relPath.endsWith(".tsx")) {
            return;
          }
          if (
            listedPaths(allowlist, options.allowlistRule, optionPaths).includes(
              relPath
            )
          ) {
            return;
          }
          const source = context.sourceCode.getText();
          const findings = normalizeFindings(options.run(relPath, source));
          for (const violation of findings) {
            const loc = violationLoc(violation);
            context.report({
              node,
              message: violationMessage(violation),
              loc: {
                start: loc,
                end: loc,
              },
              ...(options.fixable
                ? {
                    fix(fixer) {
                      const fixed = reorderMainExport(source, relPath);
                      if (!fixed) {
                        return null;
                      }
                      return fixer.replaceTextRange([0, source.length], fixed);
                    },
                  }
                : {}),
            });
          }
        },
      };
    },
  };
}

const plugin = {
  rules: {
    "file-layout": createKodeTasteRule({
      allowlistRule: "fileLayout",
      run: findFileLayoutIssue,
      tsxOnly: true,
      fixable: true,
    }),
    "prop-bags": createKodeTasteRule({
      allowlistRule: "propBags",
      run: findPropBags,
      tsxOnly: true,
    }),
    "use-state": createKodeTasteRule({
      allowlistRule: "useState",
      run: (relPath, source) =>
        findHookPressure(relPath, source).filter(
          (item) => item.kind === "use-state"
        ),
    }),
    "use-effect": createKodeTasteRule({
      allowlistRule: "useEffect",
      run: (relPath, source) =>
        findHookPressure(relPath, source).filter(
          (item) => item.kind === "use-effect"
        ),
    }),
    "inner-html": createKodeTasteRule({
      allowlistRule: "innerHtml",
      run: findInnerHtml,
    }),
    "hook-size": createKodeTasteRule({
      allowlistRule: "hookSize",
      run: findHookSize,
    }),
    "effect-fns": createKodeTasteRule({
      allowlistRule: "effectFns",
      run: findEffectInnerFns,
    }),
  },
};

export default plugin;
