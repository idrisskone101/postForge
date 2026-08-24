---
name: Kode Mode
description: >-
  kode's structure taste on poteto-mode. Use for kode, /kode-mode, a taste
  pass, user-visible bug-fix video demos, RecordScreen walkthroughs at verify
  (not only post-merge), or portable structure taste.
disable-model-invocation: true
mode: true
---

# Kode mode

Primary mode for this human. **Poteto-mode owns the workflow.** Read and follow the poteto-mode skill first (playbooks, principles, subagents, verification, shipping). This skill only adds structure taste and a video demo at verify. When the two conflict on process, shipping, verification, or structure, poteto-mode wins. Kode only adds taste inside poteto playbooks.

Poteto-mode path (plugin cache may differ by install): the `poteto-mode` skill under the pstack / poteto plugin. Prefer the installed skill name `/poteto-mode` rather than hard-coding a cache path.

## Non-negotiables

- Multi-step work still starts with poteto-mode: todolist, matched playbook, principles named in the reply.
- New or changed code follows the structure taste section below. React files also follow the React adapter. Database work also follows the Data adapter.
- After a user-visible bug fix is verified, and again after a full run lands (all PRs merged, or the human says the program is done), produce a short video demo of the new behavior. Don't end a UI bug fix with screenshots alone, and don't end a merged run with "merged" alone.

## Structure taste

Language-agnostic. Apply in any stack.

### Colocate state

Keep state next to the code that owns it. Don't lift it until a second consumer needs it.

### Shrink the public API

Fewer parameters, fewer exports, fewer knobs. A long positional list is a smell. So is a call-site object literal that lists many unrelated keys and callbacks. Shrink what the function needs.

One named domain object that already exists is fine. If you have to assemble a big bag to call the function, the function wants too much: split it, or have it import what it needs. Threading the same bag through many layers is still a smell: hoist or collapse at the owner, then stop.

### Don't inject a bag of capabilities

Passing an object of functions into a function (`findX`, `readY`, `saveZ`, `createW`) is a smell. Those functions belong in a helper module that the callee imports. The caller stays a thin adapter: parse, call one helper, respond. Don't assemble a deps literal at the call site to make the helper "pure" or "testable". Tests import the helpers, or test them directly.

The shape to refuse is `src/app/api/avatars/import-candidate/route.ts`. The POST handler builds a six-function deps object (`findGeneratedImageFile`, `readStorage`, `saveAvatarImage`, `createAvatar`, `discardGeneratedFiles`, `ensureIdentityPack`) and hands it to `acceptAvatarCandidateAsImportedAvatar`. Put those Prisma and storage calls in a helper the route imports. Don't keep the deps bag. Don't copy this pattern into new routes.

### Group files by feature

Don't pile loose files at a folder root (`src/components/`, `src/lib/`, or the equivalent). New files go in a feature folder. When you touch a loose cluster, group it. A folder of related files beats a flat dump.

Organize by page, section, or domain. The exact folder name is less important than not leaving a dozen siblings with no grouping.

### Types live in types files

Don't keep exported or component-level types in implementation modules. Put them in a `types.ts` (or `foo-types.ts`) next to the feature: page, section, or folder. Implementation files import types. The implementation file is behavior and glue.

A one-off type used once inside a helper can stay private in that helper module. It does not belong in a React component file.

### Reuse before invent

Before adding a function or type, search for an existing one that already does the job. Prefer extending or composing it. Don't invent a near-duplicate with a new name.

### Main symbol first

In a module, put the main export at the top, after imports. Shared and component types live in the feature types file, not stacked above the component. Helpers go below. Tiny private types that only one helper uses can stay in that helper module.

### Split non-presentation logic

Keep the calling module thin. If it accumulates parsers, mappers, formatters, fetch helpers, or big pure transforms, move those into a sibling named for the feature. Short helpers that only serve the caller can stay. Split when the helper block is the part you skip while reading the main export.

Import those helpers. Don't pass them in.

### Prefer derivation over sync

Derive values at the call site from inputs you already have. Don't copy them into a second store and keep the two in sync. Keep explicit sync only for external systems: DOM, subscriptions, files, non-framework widgets.

### Errors ride a railway

The happy path is a straight line. Each failure is a named branch: log with enough context to debug, map to a typed error or user-facing result, then either return or resume the loop. Don't empty-catch. Don't let a thrown error be the only control flow when the caller needs to recover.

A small `{ ok: true, value } | { ok: false, error }` (or equivalent) is the shape when the caller must branch. Don't add a Result library for its own sake. Don't nest try/catch pyramids. Early-return the error branch so the rest of the function stays the happy path.

Log failures. A `console.error` with no context is barely better than silence. Include the operation, the id, and the cause. Warnings for recoverable degradation. Don't log successful happy-path chatter.

## Conflict resolution

Repo gates and poteto-mode beat taste. If taste is right but tests or lints ban the shape, land a test or gate PR first, then the taste sweep. Do not cite laziness and ship a weaker substitute. Example: tests that ban `createContext` get a test PR that lifts the ban before any Context rewrite.

## React adapter

Apply the principles above. This section is the React mapping, not the portable lesson.

### Types files

Component props, view-models, and feature types go in `types.ts` in that page or section folder. Don't export types from the `.tsx` file. `clone-output/types.ts` and `slideshow/types.ts` are the shape. Growing `export type` next to JSX is not.

### Group components by feature

Don't add another loose file at `src/components/`. New UI goes in a feature folder next to its types and helpers. When you touch a cluster of related loose components, group them.

### dangerouslySetInnerHTML

Ban it. Don't render HTML strings. Use React nodes, text, or a dedicated component. Don't inject scripts, comments, or markup through inner HTML.

Existing allowlisted uses are debt. Don't add more. Don't copy the pattern out of `src/components/ui/`.

### useContext

Prefer colocated state. Reach for `useContext` when a tree passes the same values through many layers.

Consider Context past these counts:

- A component takes 5 or more props that are mostly unrelated fields or callbacks, not one named view-model, one `children`, or one `className`.
- A single component file holds 5 or more `useState` calls.

Past those numbers, ask whether a small Context, or a reducer plus Context, owned near the feature root would shrink the tree. Named view-models are still fine when they name one coherent object. They are not a substitute for Context when the same bag is threaded through many layers.

Context is not automatic. Skip it when:

- Props are a tight, stable API for a leaf: media frame, trim range, icon button.
- The data is used by one child only.
- A Context would force unrelated subtrees to re-render for no reason.
- The bag is really one domain object that should stay a typed view-model.

### Named view-models

One coherent object at the owner is fine. Stop there. Don't thread the same bag through many layers instead of Context.

### useEffect

`useEffect` is allowed. It is not the default first tool.

Prefer deriving state during render, event handlers, and framework data APIs (route loaders, query libraries, server components) before reaching for an effect. Multiple effects in one file, about three or more, are a smell: see if they can merge, move into the event that caused the change, or live in a custom hook with a clear name. Keep effects that sync with external systems.

### Helper modules

React files stay mostly JSX and light glue. Non-UI logic goes in a sibling `foo-helpers.ts` next to `foo.tsx`. Import helpers. Don't pass them in as a deps object.

### Optional checker

If the repo has `pnpm check:kode-taste`, run it as an adapter for these React thresholds and the innerHTML ban. It is not the portable lesson.

## Data adapter

This stack uses Prisma. The portable lesson is lean queries. Apply it to any database client.

Database work is on the hot path. Slowness usually starts here. Every Prisma (or SQL) call should do only the work you need:

- `select` the fields you use. Don't load the whole row for three fields.
- Filter in the query, not in JS after `findMany`.
- No N+1. Use `include` / `in` in one round trip, or batch.
- Don't query twice for the same row.
- Independent reads can run in `Promise.all`.
- Multi-step writes that must be atomic go in a transaction.
- Unavailable data stays unavailable. Don't substitute zeros or demo rows.

If a query does extra work "just in case", cut it. Fetch what the screen or mutation needs, then stop.

## Demo after verify (and after the run)

Record a short walkthrough when either of these is true:

- You just verified a user-visible bug fix (poteto-mode Bug fix step 4). Do this before you call the fix done.
- The work for a request is fully merged (orchestrate/autopilot predicate met, or the human closes the run).

Then:

1. Walk the new or changed surfaces (desktop and, if UI, one mobile pass when relevant).
2. Prefer the repo's UI harness / `RecordScreen` / computerUse against a production build when that matches poteto-mode shipping rules.
3. Put the video under `/tmp/...` or `/opt/cursor/artifacts`. Link it in the final reply. Don't commit large videos into the repo unless asked.

If the change is non-visual (lib-only), show the key CLI/test proof or a minimal UI path that exercises the change instead of a fake tour.

## What this skill does not own

Poteto-mode still owns investigation, architect, swarm, verification, babysit, shipping, and orchestrate. Don't restate those playbooks here.
