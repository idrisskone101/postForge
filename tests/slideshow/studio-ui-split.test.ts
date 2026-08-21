import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CAP = 400;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const slideshowDir = path.join(rootDir, "src/components/slideshow");

function countNewlines(filePath: string): number {
  let lines = 0;
  for (const byte of readFileSync(filePath)) {
    if (byte === 10) lines += 1;
  }
  return lines;
}

function listModules(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listModules(full, files);
      continue;
    }
    if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      files.push(full);
    }
  }
  return files;
}

const files = listModules(slideshowDir);
assert.ok(
  !existsSync(path.join(slideshowDir, "studio-views.tsx")),
  "studio-views.tsx must be split, not relocated",
);

const nestedBarrels = files.filter((file) => {
  const rel = path.relative(slideshowDir, file);
  return rel !== "index.ts" && (rel.endsWith("/index.ts") || rel.endsWith("/index.tsx"));
});
assert.deepEqual(nestedBarrels, [], "slideshow UI must not add nested barrels");

for (const file of files) {
  const rel = path.relative(rootDir, file);
  const lines = countNewlines(file);
  assert.ok(lines <= CAP, `${rel} is ${lines} lines (cap ${CAP})`);
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /import\(["']\.\/api["']\)/,
    `${rel} must not reintroduce import("./api")`,
  );
}

const creatorSource = readFileSync(path.join(slideshowDir, "creator-view.tsx"), "utf8");
assert.match(
  creatorSource,
  /import \{ requestSlideshowCreatorDerive \} from "@\/lib\/slideshow\/client"/,
);

const studioSource = readFileSync(path.join(slideshowDir, "slideshow-studio.tsx"), "utf8");
assert.match(studioSource, /fetchSlideshowProject\(item\.id/);

const draftsSource = readFileSync(path.join(slideshowDir, "drafts-view.tsx"), "utf8");
assert.match(draftsSource, /previewImageUrls/);
assert.doesNotMatch(draftsSource, /project\.slides\b/);

const publishSource = readFileSync(path.join(slideshowDir, "publish-dialog.tsx"), "utf8");
assert.match(publishSource, /destinationBlocked/);
assert.match(publishSource, /tiktokConnected/);
assert.match(publishSource, /publishingToTikTok && !tiktokConnected/);

const viewModels = readFileSync(path.join(slideshowDir, "view-models.ts"), "utf8");
assert.match(viewModels, /export type SlideshowEditorWorkspace/);
assert.match(viewModels, /export type CreatorDraft/);
assert.match(viewModels, /export type StudioHomeView/);
assert.match(viewModels, /export type SlideshowPublishWorkspace/);

const PROP_EXTRAS = new Set(["className", "hidden"]);
const MAX_DATA_PROPS = 7;
const REQUIRED_VIEW_MODEL: Record<string, string> = {
  EditorWorkspace: "workspace",
  EditorHeader: "workspace",
  EditorSlideRail: "workspace",
  EditorPreview: "workspace",
  EditorInspector: "workspace",
  EditorCollectionPicker: "workspace",
  SlideshowBoardView: "workspace",
  SlideshowPlayView: "workspace",
  CreatorCopyForm: "draft",
  CreatorTemplatePanel: "draft",
  CreatorImagePicker: "draft",
  StudioHome: "home",
  CreateView: "home",
  DraftsView: "home",
  StudioSectionNav: "home",
  CreateTemplateGallery: "home",
  CreatorView: "home",
  PublishTikTokFields: "publish",
  PublishSidebar: "publish",
  PublishDialog: "dialog",
};

function skipWs(source: string, index: number) {
  while (index < source.length && /\s/.test(source[index] ?? "")) index += 1;
  return index;
}

function skipGeneric(source: string, index: number) {
  if (source[index] !== "<") return index;
  let depth = 1;
  index += 1;
  while (index < source.length && depth > 0) {
    if (source[index] === "<") depth += 1;
    else if (source[index] === ">") depth -= 1;
    index += 1;
  }
  return index;
}

function parseDestructureKeys(source: string, openIndex: number) {
  const keys: string[] = [];
  let index = openIndex + 1;
  let depth = 1;
  let current = "";
  while (index < source.length && depth > 0) {
    const ch = source[index] ?? "";
    if (ch === "{") {
      depth += 1;
      current += ch;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) break;
      current += ch;
    } else if (ch === "," && depth === 1) {
      const key = current.trim().split(/[\s=:]/, 1)[0];
      if (key) keys.push(key.replace(/^\.{3}/, ""));
      current = "";
    } else {
      current += ch;
    }
    index += 1;
  }
  const last = current.trim().split(/[\s=:]/, 1)[0];
  if (last) keys.push(last.replace(/^\.{3}/, ""));
  return keys;
}

function exportedComponents(source: string) {
  const results: Array<{ name: string; kind: "empty" | "named" | "destructure"; keys: string[] }> =
    [];
  const pattern = /export function ([A-Z][A-Za-z0-9]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const name = match[1];
    let index = skipWs(source, match.index + match[0].length);
    index = skipGeneric(source, index);
    index = skipWs(source, index);
    if (source[index] !== "(") continue;
    index = skipWs(source, index + 1);
    if (source[index] === ")") {
      results.push({ name, kind: "empty", keys: [] });
      continue;
    }
    if (source[index] === "{") {
      results.push({
        name,
        kind: "destructure",
        keys: parseDestructureKeys(source, index),
      });
      continue;
    }
    results.push({ name, kind: "named", keys: [] });
  }
  return results;
}

for (const file of files) {
  if (!file.endsWith(".tsx")) continue;
  const rel = path.relative(rootDir, file);
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /createContext\(/, `${rel} must not add React Context`);
  for (const component of exportedComponents(source)) {
    const dataKeys = component.keys.filter((key) => !PROP_EXTRAS.has(key));
    assert.ok(
      dataKeys.length <= MAX_DATA_PROPS,
      `${rel} ${component.name} dumps ${dataKeys.length} fields (${dataKeys.join(", ")})`,
    );
    const expected = REQUIRED_VIEW_MODEL[component.name];
    if (!expected) continue;
    assert.equal(component.kind, "destructure", `${component.name} must take a named view-model`);
    assert.deepEqual(
      dataKeys,
      [expected],
      `${component.name} must take { ${expected} }, got { ${dataKeys.join(", ")} }`,
    );
  }
}

console.log("slideshow studio UI split tests passed");
