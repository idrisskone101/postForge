import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkKodeTaste,
  findFileLayoutIssue,
  PROP_BAG_LIMIT,
  reorderMainExport,
  USE_EFFECT_LIMIT,
  USE_STATE_LIMIT,
  type KodeTasteAllowlist,
} from "../../scripts/check-kode-taste";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function withTempRoot(run: (rootDir: string) => void): void {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), "kode-taste-"));
  try {
    run(rootDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

function writeModule(rootDir: string, relPath: string, source: string): void {
  const absPath = path.join(rootDir, relPath);
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, source);
}

const helperFirst = `import { cn } from "./cn";

type CardProps = {
  title: string;
};

function glyph(title: string) {
  return title.slice(0, 1);
}

export function Card({ title }: CardProps) {
  return <h1 className={cn("title")}>{glyph(title)}</h1>;
}
`;

const issue = findFileLayoutIssue("src/card.tsx", helperFirst);
assert.deepEqual(issue, {
  kind: "file-layout",
  path: "src/card.tsx",
  exportName: "Card",
  exportLine: 11,
  firstHelperLine: 7,
});

const reordered = reorderMainExport(helperFirst, "src/card.tsx");
assert.ok(reordered);
assert.equal(findFileLayoutIssue("src/card.tsx", reordered), null);
assert.match(reordered, /export function Card[\s\S]*function glyph/);
assert.doesNotMatch(reordered, /function glyph[\s\S]*export function Card/);

const alreadyGood = `import { cn } from "./cn";

export function Card({ title }: { title: string }) {
  return <h1 className={cn("title")}>{glyph(title)}</h1>;
}

function glyph(title: string) {
  return title.slice(0, 1);
}
`;
assert.equal(reorderMainExport(alreadyGood, "src/card.tsx"), null);

const twoExports = `const startActions = [{ href: "/clone" }];

export function HomeEmptyPanel() {
  return <p>empty</p>;
}

export function HomeStartWork() {
  return <a href={startActions[0]?.href}>start</a>;
}
`;
const startWork = reorderMainExport(twoExports, "src/app/home-start-work.tsx");
assert.ok(startWork);
assert.match(
  startWork,
  /export function HomeStartWork[\s\S]*const startActions[\s\S]*export function HomeEmptyPanel/
);

withTempRoot((rootDir) => {
  writeModule(rootDir, "src/card.tsx", helperFirst);
  writeModule(
    rootDir,
    "src/bag.tsx",
    `export function Panel({ a, b, c, d, e }: { a: number; b: number; c: number; d: number; e: number }) {
  return <div>{a + b + c + d + e}</div>;
}
`
  );
  writeModule(
    rootDir,
    "src/state.tsx",
    `"use client";
import { useEffect, useState } from "react";
export function Form() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [d, setD] = useState(0);
  const [e, setE] = useState(0);
  useEffect(() => { setA(1); }, []);
  useEffect(() => { setB(1); }, []);
  useEffect(() => { setC(1); }, []);
  return <button onClick={() => { setD(1); setE(1); }}>{a+b+c+d+e}</button>;
}
`
  );
  writeModule(
    rootDir,
    "src/components/ui/button.tsx",
    `function glyph() { return "*"; }
export function Button() { return <button>{glyph()}</button>; }
`
  );

  const violations = checkKodeTaste({ rootDir });
  assert.equal(
    violations.some((item) => item.kind === "file-layout" && item.path === "src/card.tsx"),
    true
  );
  assert.equal(
    violations.some((item) => item.kind === "prop-bag" && item.path === "src/bag.tsx"),
    true
  );
  assert.equal(
    violations.some(
      (item) =>
        item.kind === "use-state" &&
        item.path === "src/state.tsx" &&
        item.count >= USE_STATE_LIMIT
    ),
    true
  );
  assert.equal(
    violations.some(
      (item) =>
        item.kind === "use-effect" &&
        item.path === "src/state.tsx" &&
        item.count >= USE_EFFECT_LIMIT
    ),
    true
  );
  assert.equal(
    violations.some((item) => item.path === "src/components/ui/button.tsx"),
    false
  );
});

withTempRoot((rootDir) => {
  writeModule(rootDir, "src/card.tsx", alreadyGood);
  const violations = checkKodeTaste({
    rootDir,
    allowlist: {
      fileLayout: ["src/card.tsx"],
      propBags: [],
      useState: [],
      useEffect: [],
    },
  });
  assert.deepEqual(violations, [
    { kind: "stale-allowlist", path: "src/card.tsx", rule: "fileLayout" },
  ]);
});

const namedViewModel = `export function Panel({ workspace }: { workspace: { title: string } }) {
  return <h1>{workspace.title}</h1>;
}
`;
assert.equal(findFileLayoutIssue("src/panel.tsx", namedViewModel), null);

console.log(
  `kode-taste detector: layout, ${PROP_BAG_LIMIT}-prop bags, ${USE_STATE_LIMIT} useState, ${USE_EFFECT_LIMIT} useEffect`
);

const allowlist = JSON.parse(
  readFileSync(path.join(repoRoot, "scripts", "kode-taste-allowlist.json"), "utf8")
) as KodeTasteAllowlist;
const repoViolations = checkKodeTaste({
  rootDir: repoRoot,
  allowlist,
});
assert.deepEqual(repoViolations, []);
