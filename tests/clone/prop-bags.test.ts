import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../../", import.meta.url);
const VIEW_MODEL_PROPS = new Set([
  "draft",
  "workspace",
  "action",
  "review",
  "model",
  "production",
  "identity",
]);
const EXTRA_PROPS = new Set(["hidden", "className"]);

function listTsx(relativeDir: string, files: string[] = []) {
  const dir = new URL(relativeDir, repoRoot);
  for (const entry of readdirSync(dir)) {
    const relative = `${relativeDir}${entry}`;
    const full = join(dir.pathname, entry);
    if (statSync(full).isDirectory()) {
      listTsx(`${relative}/`, files);
      continue;
    }
    if (entry.endsWith(".tsx")) files.push(relative);
  }
  return files;
}

function parseExportedProps(source: string) {
  const results: { name: string; props: string[] }[] = [];
  const pattern = /export (?:default )?function (\w+)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const name = match[1];
    const rest = source.slice(match.index + match[0].length).trimStart();
    if (rest.startsWith(")")) {
      results.push({ name, props: [] });
      continue;
    }
    assert.equal(
      rest.startsWith("{"),
      true,
      `${name} must take a named props object, not positional arguments`
    );
    let depth = 0;
    let end = 0;
    for (let i = 0; i < rest.length; i++) {
      const char = rest[i];
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const inner = rest.slice(1, end);
    const props = inner
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.split("=")[0]?.trim().split(":")[0]?.trim() ?? "")
      .filter((key) => key.length > 0);
    results.push({ name, props });
  }
  return results;
}

const files = [
  "src/components/ugc-clone-form.tsx",
  "src/components/clone-output-review-detail.tsx",
  ...listTsx("src/components/clone/"),
  ...listTsx("src/components/clone-output/"),
  ...listTsx("src/app/ugc-clone/"),
];

for (const file of files) {
  const source = readFileSync(new URL(file, repoRoot), "utf8");
  for (const exported of parseExportedProps(source)) {
    const viewModels = exported.props.filter((prop) => VIEW_MODEL_PROPS.has(prop));
    const extras = exported.props.filter((prop) => EXTRA_PROPS.has(prop));
    const unknown = exported.props.filter(
      (prop) => !VIEW_MODEL_PROPS.has(prop) && !EXTRA_PROPS.has(prop)
    );
    assert.equal(
      unknown.length,
      0,
      `${file} ${exported.name} dumps ${unknown.join(", ")} instead of a named view-model`
    );
    assert.ok(
      viewModels.length <= 1,
      `${file} ${exported.name} takes ${viewModels.length} view-models; at most one is allowed`
    );
    assert.ok(
      extras.length <= 2,
      `${file} ${exported.name} takes extra props ${extras.join(", ")}; only hidden and className are allowed`
    );
    assert.ok(
      exported.props.length <= 3,
      `${file} ${exported.name} takes ${exported.props.length} props`
    );
  }
}
