import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

export const USE_STATE_LIMIT = 5;
export const USE_EFFECT_LIMIT = 3;
export const PROP_BAG_LIMIT = 5;

const EXEMPT_PROP_KEYS = new Set(["children", "className", "key", "hidden"]);

export type KodeTasteAllowlist = {
  fileLayout: string[];
  propBags: string[];
  useState: string[];
  useEffect: string[];
};

export type KodeTasteViolation =
  | {
      kind: "file-layout";
      path: string;
      exportName: string;
      exportLine: number;
      firstHelperLine: number;
    }
  | {
      kind: "prop-bag";
      path: string;
      component: string;
      props: string[];
    }
  | { kind: "use-state"; path: string; count: number }
  | { kind: "use-effect"; path: string; count: number }
  | {
      kind: "stale-allowlist";
      path: string;
      rule: "fileLayout" | "propBags" | "useState" | "useEffect";
    }
  | {
      kind: "missing-allowlist";
      path: string;
      rule: "fileLayout" | "propBags" | "useState" | "useEffect";
    };

const EMPTY_ALLOWLIST: KodeTasteAllowlist = {
  fileLayout: [],
  propBags: [],
  useState: [],
  useEffect: [],
};

function posixRel(rootDir: string, absPath: string): string {
  return path.relative(rootDir, absPath).split(path.sep).join("/");
}

function isExemptPath(relPath: string): boolean {
  return (
    relPath.startsWith("src/generated/") ||
    relPath.startsWith("src/components/ui/")
  );
}

export function collectReactModules(rootDir: string): string[] {
  const srcDir = path.join(rootDir, "src");
  const files: string[] = [];
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
        visit(absPath);
        continue;
      }
      if (!entry.isFile() || !relPath.endsWith(".tsx")) {
        continue;
      }
      if (isExemptPath(relPath)) {
        continue;
      }
      files.push(relPath);
    }
  };

  visit(srcDir);
  return files;
}

function isDirective(statement: ts.Statement): boolean {
  if (!ts.isExpressionStatement(statement)) {
    return false;
  }
  return (
    ts.isStringLiteral(statement.expression) &&
    (statement.expression.text === "use client" ||
      statement.expression.text === "use server")
  );
}

const NEXT_MODULE_EXPORTS = new Set([
  "metadata",
  "dynamic",
  "viewport",
  "revalidate",
  "runtime",
  "fetchCache",
  "preferredRegion",
]);

function exportedBindingName(statement: ts.Statement): string | null {
  if (!ts.isVariableStatement(statement)) {
    return null;
  }
  if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
    return null;
  }
  const binding = statement.declarationList.declarations[0]?.name;
  if (!binding || !ts.isIdentifier(binding)) {
    return null;
  }
  return binding.text;
}

function isPrefixStatement(statement: ts.Statement): boolean {
  if (isDirective(statement)) {
    return true;
  }
  if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
    return true;
  }
  if (
    ts.isTypeAliasDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  ) {
    return true;
  }
  if (ts.isExportDeclaration(statement) && statement.isTypeOnly) {
    return true;
  }
  const bindingName = exportedBindingName(statement);
  if (bindingName && NEXT_MODULE_EXPORTS.has(bindingName)) {
    return true;
  }
  if (
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "generateMetadata"
  ) {
    return true;
  }
  return false;
}

function kebabToPascal(value: string): string {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function expectedMainName(relPath: string): string {
  const base = path.basename(relPath, ".tsx");
  if (
    base === "page" ||
    base === "layout" ||
    base === "loading" ||
    base === "error" ||
    base === "not-found" ||
    base === "template"
  ) {
    return "default";
  }
  return kebabToPascal(base);
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false)
  );
}

function isPascalCase(name: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

function exportedComponentName(statement: ts.Statement): string | null {
  if (ts.isFunctionDeclaration(statement)) {
    const exported =
      hasModifier(statement, ts.SyntaxKind.ExportKeyword) ||
      hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
    if (!exported) {
      return null;
    }
    if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
      return statement.name?.text ?? "default";
    }
    if (!statement.name || !isPascalCase(statement.name.text)) {
      return null;
    }
    return statement.name.text;
  }

  if (!ts.isVariableStatement(statement)) {
    return null;
  }
  if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
    return null;
  }
  const binding = statement.declarationList.declarations[0]?.name;
  if (!binding || !ts.isIdentifier(binding) || !isPascalCase(binding.text)) {
    return null;
  }
  return binding.text;
}

function helperName(statement: ts.Statement): string | null {
  if (exportedComponentName(statement)) {
    return null;
  }
  if (ts.isFunctionDeclaration(statement) && statement.name) {
    return statement.name.text;
  }
  if (!ts.isVariableStatement(statement)) {
    return null;
  }
  if (hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
    return null;
  }
  const binding = statement.declarationList.declarations[0]?.name;
  if (!binding || !ts.isIdentifier(binding)) {
    return null;
  }
  return binding.text;
}

function parseSource(relPath: string, source: string): ts.SourceFile {
  return ts.createSourceFile(
    relPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
}

function lineOf(sourceFile: ts.SourceFile, position: number): number {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function findMainStatementIndex(
  statements: readonly ts.Statement[],
  relPath: string
): number {
  const expected = expectedMainName(relPath);
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    const name = exportedComponentName(statement);
    if (!name) {
      continue;
    }
    if (
      expected === "default" &&
      hasModifier(statement, ts.SyntaxKind.DefaultKeyword)
    ) {
      return index;
    }
    if (name === expected) {
      return index;
    }
  }
  for (let index = 0; index < statements.length; index += 1) {
    if (exportedComponentName(statements[index])) {
      return index;
    }
  }
  return -1;
}

function lastLeadingPrefixIndex(statements: readonly ts.Statement[]): number {
  let lastPrefix = -1;
  for (let index = 0; index < statements.length; index += 1) {
    if (!isPrefixStatement(statements[index])) {
      break;
    }
    lastPrefix = index;
  }
  return lastPrefix;
}

export function findFileLayoutIssue(
  relPath: string,
  source: string
): Extract<KodeTasteViolation, { kind: "file-layout" }> | null {
  const sourceFile = parseSource(relPath, source);
  const statements = [...sourceFile.statements];
  const mainIndex = findMainStatementIndex(statements, relPath);
  if (mainIndex < 0) {
    return null;
  }

  let firstHelper: { name: string; line: number } | null = null;
  for (let index = 0; index < mainIndex; index += 1) {
    const statement = statements[index];
    if (isPrefixStatement(statement)) {
      continue;
    }
    firstHelper = {
      name:
        helperName(statement) ||
        exportedComponentName(statement) ||
        "module",
      line: lineOf(sourceFile, statement.getStart()),
    };
    break;
  }

  if (!firstHelper) {
    return null;
  }
  const mainStatement = statements[mainIndex];
  const exportName =
    exportedComponentName(mainStatement) ?? expectedMainName(relPath);
  return {
    kind: "file-layout",
    path: relPath,
    exportName,
    exportLine: lineOf(sourceFile, mainStatement.getStart()),
    firstHelperLine: firstHelper.line,
  };
}

export function reorderMainExport(source: string, relPath: string): string | null {
  const sourceFile = parseSource(relPath, source);
  const statements = [...sourceFile.statements];
  const lastPrefix = lastLeadingPrefixIndex(statements);
  const main = findMainStatementIndex(statements, relPath);

  if (main === -1 || main === lastPrefix + 1) {
    return null;
  }

  const ranges = statements.map((statement, index) => ({
    start: statement.getFullStart(),
    end:
      index + 1 < statements.length
        ? statements[index + 1].getFullStart()
        : source.length,
  }));

  const chunks: string[] = [];
  const firstStart = statements[0]?.getFullStart() ?? 0;
  if (firstStart > 0) {
    chunks.push(source.slice(0, firstStart));
  }

  const mainText = source.slice(ranges[main].start, ranges[main].end);
  if (lastPrefix === -1) {
    chunks.push(mainText);
  }

  for (let index = 0; index < statements.length; index += 1) {
    if (index === main) {
      continue;
    }
    chunks.push(source.slice(ranges[index].start, ranges[index].end));
    if (index === lastPrefix) {
      chunks.push(mainText);
    }
  }

  return chunks.join("");
}

function bindingKeys(pattern: ts.ObjectBindingPattern): string[] {
  return pattern.elements.flatMap((element) => {
    if (element.dotDotDotToken) {
      return [];
    }
    if (ts.isIdentifier(element.name)) {
      return [element.name.text];
    }
    return [];
  });
}

function firstParamKeys(statement: ts.Statement): string[] | null {
  let parameters: ts.NodeArray<ts.ParameterDeclaration> | undefined;
  if (ts.isFunctionDeclaration(statement)) {
    parameters = statement.parameters;
  } else if (ts.isVariableStatement(statement)) {
    const initializer = statement.declarationList.declarations[0]?.initializer;
    if (
      initializer &&
      (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
    ) {
      parameters = initializer.parameters;
    }
  }
  const parameter = parameters?.[0];
  if (!parameter) {
    return [];
  }
  if (ts.isIdentifier(parameter.name)) {
    return null;
  }
  if (ts.isObjectBindingPattern(parameter.name)) {
    return bindingKeys(parameter.name);
  }
  return null;
}

export function findPropBags(
  relPath: string,
  source: string
): Array<Extract<KodeTasteViolation, { kind: "prop-bag" }>> {
  const sourceFile = parseSource(relPath, source);
  const bags: Array<Extract<KodeTasteViolation, { kind: "prop-bag" }>> = [];
  for (const statement of sourceFile.statements) {
    const componentName = exportedComponentName(statement);
    if (!componentName) {
      continue;
    }
    const keys = firstParamKeys(statement);
    if (keys === null) {
      continue;
    }
    const counted = keys.filter((key) => !EXEMPT_PROP_KEYS.has(key));
    if (counted.length < PROP_BAG_LIMIT) {
      continue;
    }
    bags.push({
      kind: "prop-bag",
      path: relPath,
      component: componentName,
      props: counted,
    });
  }
  return bags;
}

function countCall(source: string, name: string): number {
  const pattern = new RegExp(String.raw`\b${name}\s*(?:<[^>]*>)?\s*\(`, "g");
  return source.match(pattern)?.length ?? 0;
}

export function findHookPressure(
  relPath: string,
  source: string
): Array<
  Extract<KodeTasteViolation, { kind: "use-state" | "use-effect" }>
> {
  const violations: Array<
    Extract<KodeTasteViolation, { kind: "use-state" | "use-effect" }>
  > = [];
  const stateCount = countCall(source, "useState");
  if (stateCount >= USE_STATE_LIMIT) {
    violations.push({ kind: "use-state", path: relPath, count: stateCount });
  }
  const effectCount = countCall(source, "useEffect");
  if (effectCount >= USE_EFFECT_LIMIT) {
    violations.push({ kind: "use-effect", path: relPath, count: effectCount });
  }
  return violations;
}

function allowlistSet(paths: readonly string[]): Set<string> {
  return new Set(paths);
}

export function checkKodeTaste(options: {
  rootDir: string;
  allowlist?: KodeTasteAllowlist;
}): KodeTasteViolation[] {
  const allowlist = options.allowlist ?? EMPTY_ALLOWLIST;
  const files = collectReactModules(options.rootDir);
  const violations: KodeTasteViolation[] = [];
  const seenLayout = new Set<string>();
  const seenBags = new Set<string>();
  const seenState = new Set<string>();
  const seenEffect = new Set<string>();

  for (const relPath of files) {
    const absPath = path.join(options.rootDir, relPath);
    const source = readFileSync(absPath, "utf8");
    const layout = findFileLayoutIssue(relPath, source);
    if (layout) {
      seenLayout.add(relPath);
      if (!allowlistSet(allowlist.fileLayout).has(relPath)) {
        violations.push(layout);
      }
    }
    for (const bag of findPropBags(relPath, source)) {
      seenBags.add(relPath);
      if (!allowlistSet(allowlist.propBags).has(relPath)) {
        violations.push(bag);
      }
    }
    for (const pressure of findHookPressure(relPath, source)) {
      if (pressure.kind === "use-state") {
        seenState.add(relPath);
        if (!allowlistSet(allowlist.useState).has(relPath)) {
          violations.push(pressure);
        }
      } else {
        seenEffect.add(relPath);
        if (!allowlistSet(allowlist.useEffect).has(relPath)) {
          violations.push(pressure);
        }
      }
    }
  }

  const stale = (
    rule: "fileLayout" | "propBags" | "useState" | "useEffect",
    listed: readonly string[],
    seen: Set<string>
  ): void => {
    for (const relPath of listed) {
      if (!files.includes(relPath) && !existsSync(path.join(options.rootDir, relPath))) {
        violations.push({ kind: "missing-allowlist", path: relPath, rule });
        continue;
      }
      if (!seen.has(relPath)) {
        violations.push({ kind: "stale-allowlist", path: relPath, rule });
      }
    }
  };

  stale("fileLayout", allowlist.fileLayout, seenLayout);
  stale("propBags", allowlist.propBags, seenBags);
  stale("useState", allowlist.useState, seenState);
  stale("useEffect", allowlist.useEffect, seenEffect);

  violations.sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);
    if (pathOrder !== 0) {
      return pathOrder;
    }
    return left.kind.localeCompare(right.kind);
  });
  return violations;
}

export function formatKodeTasteViolations(
  violations: readonly KodeTasteViolation[]
): string {
  const lines = ["Kode-taste check failed."];
  for (const violation of violations) {
    switch (violation.kind) {
      case "file-layout":
        lines.push(
          `${violation.path}: ${violation.exportName} is exported at line ${violation.exportLine} after helper at line ${violation.firstHelperLine}`
        );
        break;
      case "prop-bag":
        lines.push(
          `${violation.path}: ${violation.component} takes ${violation.props.length} props (${violation.props.join(", ")}); pass a named view-model, or a feature-root Context when the same bag is threaded through layers`
        );
        break;
      case "use-state":
        lines.push(
          `${violation.path}: ${violation.count} useState calls (limit ${USE_STATE_LIMIT})`
        );
        break;
      case "use-effect":
        lines.push(
          `${violation.path}: ${violation.count} useEffect calls (limit ${USE_EFFECT_LIMIT})`
        );
        break;
      case "stale-allowlist":
        lines.push(
          `${violation.path}: allowlisted for ${violation.rule} but no longer violates; remove it`
        );
        break;
      case "missing-allowlist":
        lines.push(
          `${violation.path}: allowlisted for ${violation.rule} but the file is missing`
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

export function loadKodeTasteAllowlist(rootDir: string): KodeTasteAllowlist {
  const allowlistPath = path.join(rootDir, "scripts", "kode-taste-allowlist.json");
  if (!existsSync(allowlistPath)) {
    return EMPTY_ALLOWLIST;
  }
  return JSON.parse(readFileSync(allowlistPath, "utf8")) as KodeTasteAllowlist;
}

export function fixFileLayout(options: {
  rootDir: string;
  relPath: string;
}): boolean {
  const absPath = path.join(options.rootDir, options.relPath);
  const source = readFileSync(absPath, "utf8");
  const next = reorderMainExport(source, options.relPath);
  if (next === null || next === source) {
    return false;
  }
  writeFileSync(absPath, next);
  return true;
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
  const fix = process.argv.includes("--fix");
  if (fix) {
    const files = collectReactModules(rootDir);
    let changed = 0;
    for (const relPath of files) {
      if (fixFileLayout({ rootDir, relPath })) {
        changed += 1;
        console.log(`reordered ${relPath}`);
      }
    }
    console.log(`reordered ${changed} modules`);
  }

  const allowlist = loadKodeTasteAllowlist(rootDir);
  const violations = checkKodeTaste({ rootDir, allowlist });
  if (violations.length > 0) {
    console.error(formatKodeTasteViolations(violations));
    process.exit(1);
  }
}

if (isCliEntry()) {
  main();
}
