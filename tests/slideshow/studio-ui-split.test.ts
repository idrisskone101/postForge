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

const homeProvider = readFileSync(
  path.join(slideshowDir, "slideshow-home-provider.tsx"),
  "utf8",
);
const editorProvider = readFileSync(
  path.join(slideshowDir, "slideshow-editor-provider.tsx"),
  "utf8",
);
assert.match(homeProvider, /createContext/);
assert.match(homeProvider, /export function useSlideshowHome/);
assert.match(editorProvider, /createContext/);
assert.match(editorProvider, /export function useSlideshowEditor/);

const studioHomeSource = readFileSync(path.join(slideshowDir, "studio-home.tsx"), "utf8");
const createViewSource = readFileSync(path.join(slideshowDir, "create-view.tsx"), "utf8");
const editorWorkspaceSource = readFileSync(
  path.join(slideshowDir, "editor-workspace.tsx"),
  "utf8",
);
assert.match(studioHomeSource, /useSlideshowHome\(/);
assert.doesNotMatch(studioHomeSource, /home=\{home\}/);
assert.match(createViewSource, /useSlideshowHome\(/);
assert.doesNotMatch(createViewSource, /home=\{home\}/);
assert.match(editorWorkspaceSource, /useSlideshowEditor\(/);
assert.doesNotMatch(editorWorkspaceSource, /workspace=\{workspace\}/);

const PROP_EXTRAS = new Set(["className", "hidden", "children"]);
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
const CONTEXT_HOOKS: Record<string, string> = {
  EditorWorkspace: "useSlideshowEditor",
  EditorHeader: "useSlideshowEditor",
  EditorSlideRail: "useSlideshowEditor",
  EditorPreview: "useSlideshowEditor",
  EditorInspector: "useSlideshowEditor",
  EditorCollectionPicker: "useSlideshowEditor",
  SlideshowBoardView: "useSlideshowEditor",
  SlideshowPlayView: "useSlideshowEditor",
  StudioHome: "useSlideshowHome",
  CreateView: "useSlideshowHome",
  DraftsView: "useSlideshowHome",
  StudioSectionNav: "useSlideshowHome",
  CreateTemplateGallery: "useSlideshowHome",
  CreatorView: "useSlideshowHome",
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
  for (const component of exportedComponents(source)) {
    const dataKeys = component.keys.filter((key) => !PROP_EXTRAS.has(key));
    assert.ok(
      dataKeys.length <= MAX_DATA_PROPS,
      `${rel} ${component.name} dumps ${dataKeys.length} fields (${dataKeys.join(", ")})`,
    );
    const expected = REQUIRED_VIEW_MODEL[component.name];
    if (!expected) continue;
    const hook = CONTEXT_HOOKS[component.name];
    const usesHook = Boolean(
      hook && new RegExp(String.raw`\b${hook}\s*\(`).test(source),
    );
    if (usesHook && dataKeys.length === 0) {
      continue;
    }
    assert.equal(
      component.kind,
      "destructure",
      `${component.name} must take a named view-model or read it from ${hook ?? "context"}`,
    );
    assert.deepEqual(
      dataKeys,
      [expected],
      `${component.name} must take { ${expected} }, got { ${dataKeys.join(", ")} }`,
    );
  }
}

const slideshowAppDir = path.join(rootDir, "src/app/(app)/slideshow");
const appFiles = listModules(slideshowAppDir);
for (const file of appFiles) {
  const rel = path.relative(rootDir, file);
  const lines = countNewlines(file);
  assert.ok(lines <= CAP, `${rel} is ${lines} lines (cap ${CAP})`);
}

assert.equal(
  existsSync(path.join(slideshowAppDir, "slideshow-paint-text.tsx")),
  true,
  "slideshow-paint-text.tsx must exist",
);

const MEDIA_STAGE = "#09090B";
const MEDIA_STAGE_FILES = new Set([
  "src/components/slideshow/editor-preview.tsx",
  "src/components/slideshow/slideshow-view-modes.tsx",
  "src/components/slideshow/slide-preview.tsx",
  "src/components/slideshow/creator-image-slot.tsx",
]);
const HEX_SKIP_FILES = new Set([
  "src/components/slideshow/slide-preview.tsx",
  "src/components/slideshow/editor-inspector.tsx",
]);

const chromeFiles = [
  ...files.filter((file) => file.endsWith(".tsx")),
  ...appFiles.filter((file) => file.endsWith(".tsx")),
];

for (const file of chromeFiles) {
  const rel = path.relative(rootDir, file);
  if (rel.endsWith("slideshow-paint-text.tsx")) continue;
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /(?<![\w-])(?<![\w]+:)hidden\b/,
    `${rel} must not use bare hidden class`,
  );
  const hexMatches = source.match(/#(?:[0-9A-Fa-f]{3,8})\b/g) ?? [];
  if (HEX_SKIP_FILES.has(rel)) {
    continue;
  }
  if (MEDIA_STAGE_FILES.has(rel)) {
    assert.ok(
      hexMatches.every((value) => value === MEDIA_STAGE),
      `${rel} may only use ${MEDIA_STAGE} for the media stage`,
    );
  } else {
    assert.equal(hexMatches.length, 0, `${rel} must not use literal hex`);
  }
}

const chromeSource = [
  path.join(slideshowAppDir, "slideshow-owned-header.tsx"),
  path.join(slideshowDir, "create-idea-form.tsx"),
  path.join(slideshowDir, "create-view.tsx"),
  path.join(slideshowDir, "studio-section-nav.tsx"),
  path.join(slideshowDir, "drafts-view.tsx"),
  path.join(slideshowDir, "studio-ui.tsx"),
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

assert.match(chromeSource, /SlideshowPaintText/);
assert.match(chromeSource, /paintReady \? undefined/);
assert.match(chromeSource, /pf-card/);
assert.match(chromeSource, /pf-button-primary/);
assert.match(chromeSource, /pf-section-title/);

console.log("slideshow studio UI split tests passed");
