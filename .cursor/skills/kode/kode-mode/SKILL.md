---
name: Kode Mode
description: >-
  kode's React taste layered on poteto-mode workflow. Use for kode, /kode-mode,
  or requests to work in this style.
disable-model-invocation: true
mode: true
---

# Kode mode

Primary mode for this human. **Poteto-mode owns the workflow.** Read and follow the poteto-mode skill first (playbooks, principles, subagents, verification, shipping). This skill only adds React structure taste and a post-merge demo. When the two conflict on React UI structure, this skill wins. When they conflict on process, poteto-mode wins.

Poteto-mode path (plugin cache may differ by install): the `poteto-mode` skill under the pstack / poteto plugin. Prefer the installed skill name `/poteto-mode` rather than hard-coding a cache path.

## Non-negotiables

- Multi-step work still starts with poteto-mode: todolist, matched playbook, principles named in the reply.
- New or changed React UI follows the React taste section below.
- After a full run lands (all PRs for that run merged, or the human says the program is done), produce a short video demo of the new behavior or the key surfaces they should look at. Don't end with "merged" alone.

## React taste

### State and Context

Prefer colocated state. Reach for `useContext` when a component tree is drowning in wiring.

**Thresholds (consider Context):**

- A component takes **5 or more** props that are mostly unrelated fields or callbacks (not one named view-model / one `children` / one `className`).
- A single component file holds **5 or more** `useState` calls.

Past those numbers, ask whether a small Context (or a reducer + Context) owned near the feature root would shrink the tree. Named view-models are still fine when they name one coherent object. They are not a substitute for Context when the same bag is threaded through many layers.

**Context is not automatic.** Skip it when:

- Props are a tight, stable API for a leaf (media frame, trim range, icon button).
- The data is used by one child only.
- A Context would force unrelated subtrees to re-render for no reason.
- The "bag" is really one domain object that should stay a typed view-model.

### Props

Fewer props. Prefer one coherent object or Context over a long parameter list. Prop drilling is allowed when the chain is short and the types stay honest. Long drilling of many fields is a smell: hoist with Context or collapse into one named model at the owner, then stop.

### Reuse

Before adding a function or component, search for an existing one that already does the job. Prefer extending or composing it. Don't invent a near-duplicate with a new name.

### File layout

In a React module, put the **main exported component at the top** of the file (after imports and types it needs). Helpers, small subcomponents used only here, and constants go **below**.

### Modular splits

Keep React files mostly JSX and light glue. If a component accumulates a lot of non-UI logic (parsers, mappers, formatters, fetch helpers, big pure transforms), move that into a sibling helper module named for the feature (e.g. `foo-helpers.ts` next to `foo.tsx`). Short inline helpers that only serve the JSX can stay.

Prefer smaller modules over one long file. Split when the helper block is the part you skip while reading the component.

### Effects

`useEffect` is allowed. It is not the default first tool.

Prefer deriving state during render, event handlers, and framework data APIs (route loaders, query libraries, server components) before reaching for an effect. Multiple effects in one file (about three or more) are a smell: see if they can merge, move into the event that caused the change, or live in a custom hook with a clear name. Keep effects that sync with external systems (DOM, subscriptions, non-React widgets).

## Demo after the run

When the work for a request is fully merged (orchestrate/autopilot predicate met, or the human closes the run):

1. Record a short walkthrough of the new or changed surfaces (desktop and, if UI, one mobile pass when relevant).
2. Prefer the repo's UI harness / `RecordScreen` / computerUse against a production build when that matches poteto-mode shipping rules.
3. Put the video under `/tmp/...` or the artifact path the environment expects. Link it in the final reply. Don't commit large videos into the repo unless asked.

If the change is non-visual (lib-only), show the key CLI/test proof or a minimal UI path that exercises the change instead of a fake tour.

## What this skill does not own

Poteto-mode still owns investigation, architect, swarm, verification, babysit, shipping, and orchestrate. Don't restate those playbooks here.
