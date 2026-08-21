---
name: Kode Mode
description: >-
  kode's structure taste layered on poteto-mode workflow. Use for kode,
  /kode-mode, portable structure taste, a taste pass, or requests to work
  in this style.
disable-model-invocation: true
mode: true
---

# Kode mode

Primary mode for this human. **Poteto-mode owns the workflow.** Read and follow the poteto-mode skill first (playbooks, principles, subagents, verification, shipping). This skill only adds structure taste and a post-merge demo. When the two conflict on process, shipping, verification, or structure, poteto-mode wins. Kode only adds taste inside poteto playbooks.

Poteto-mode path (plugin cache may differ by install): the `poteto-mode` skill under the pstack / poteto plugin. Prefer the installed skill name `/poteto-mode` rather than hard-coding a cache path.

## Non-negotiables

- Multi-step work still starts with poteto-mode: todolist, matched playbook, principles named in the reply.
- New or changed code follows the structure taste section below. React files also follow the React adapter.
- After a full run lands (all PRs for that run merged, or the human says the program is done), produce a short video demo of the new behavior or the key surfaces they should look at. Don't end with "merged" alone.

## Structure taste

Language-agnostic. Apply in any stack.

### Colocate state

Keep state next to the code that owns it. Don't lift it until a second consumer needs it.

### Shrink the public API

Fewer parameters, fewer exports, fewer knobs. Prefer one coherent object over a long argument list. Threading the same bag through many layers is a smell: hoist or collapse at the owner, then stop.

### Reuse before invent

Before adding a function or type, search for an existing one that already does the job. Prefer extending or composing it. Don't invent a near-duplicate with a new name.

### Main symbol first

In a module, put the main export at the top, after imports and types it needs. Helpers and private types go below.

### Split non-presentation logic

Keep the calling module thin. If it accumulates parsers, mappers, formatters, fetch helpers, or big pure transforms, move those into a sibling named for the feature. Short helpers that only serve the caller can stay. Split when the helper block is the part you skip while reading the main export.

### Prefer derivation over sync

Derive values at the call site from inputs you already have. Don't copy them into a second store and keep the two in sync. Keep explicit sync only for external systems: DOM, subscriptions, files, non-framework widgets.

## Conflict resolution

Repo gates and poteto-mode beat taste. If taste is right but tests or lints ban the shape, land a test or gate PR first, then the taste sweep. Do not cite laziness and ship a weaker substitute. Example: tests that ban `createContext` get a test PR that lifts the ban before any Context rewrite.

## React adapter

Apply the principles above. This section is the React mapping, not the portable lesson.

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

React files stay mostly JSX and light glue. Non-UI logic goes in a sibling `foo-helpers.ts` next to `foo.tsx`.

### Optional checker

If the repo has `pnpm check:kode-taste`, run it as an adapter for these React thresholds. It is not the portable lesson.

## Demo after the run

When the work for a request is fully merged (orchestrate/autopilot predicate met, or the human closes the run):

1. Record a short walkthrough of the new or changed surfaces (desktop and, if UI, one mobile pass when relevant).
2. Prefer the repo's UI harness / `RecordScreen` / computerUse against a production build when that matches poteto-mode shipping rules.
3. Put the video under `/tmp/...` or the artifact path the environment expects. Link it in the final reply. Don't commit large videos into the repo unless asked.

If the change is non-visual (lib-only), show the key CLI/test proof or a minimal UI path that exercises the change instead of a fake tour.

## What this skill does not own

Poteto-mode still owns investigation, architect, swarm, verification, babysit, shipping, and orchestrate. Don't restate those playbooks here.
