# Visual regressions

Catch cut-off copy, missing borders, flattened buttons, off spacing, and sluggish navigation after first-paint, Lighthouse, or shell CSS changes. A green Lighthouse score is not proof.

## Sub-features

- First-paint vs post-`window.load` screenshots on changed routes.
- Text overflow, borders, button chrome, and spacing against `DESIGN.md`.
- Sidebar navigation feel and `prefetch` on primary links.
- Shared-shell check: if `first-paint-css.ts`, `WorkspaceShell`, or `dashboard.css` load timing changed, sweep every visible workspace route, not only the edited page.

## How to get to it (user POV)

Open the production dashboard the way a user does. Walk the sidebar. Read headings and empty-state copy. Click primary and secondary buttons. Wait for the page to finish loading, then look again.

## Driving it with control-postforge

```bash
control-postforge launch
control-postforge doctor
```

For each changed route (and each route that shares first-paint CSS or a deferred island):

```bash
control-postforge browser goto <path>
control-postforge browser screenshot --path "$PROOF_DIR/<slug>-desktop-first.png"
# wait until window.load, then again
control-postforge browser screenshot --path "$PROOF_DIR/<slug>-desktop-loaded.png"
control-postforge browser snapshot --aria --path "$PROOF_DIR/<slug>-desktop.aria.txt"
```

Repeat at mobile `390x844`. On Character builder and Automations new (first-input islands), capture once more after a pointer or key event.

Then click 3–4 primary sidebar links from Home and record whether the destination feels instant. If nav is slow, inspect the link for `prefetch={false}`.

Pass only if every item in the Visual regressions checklist in `SKILL.md` is clean. Treat failures as P0/P1.

## Gotchas

- First-paint CSS often pins `8rem` / `12rem` and `overflow: hidden`. Visible text may live in `sr-only` until `dashboard.css` loads. If the clip is still there after load, it is a product bug, not an acceptable LCP trick.
- Deferred islands (`ssr: false` after `window.load` or first input) can hide a static shell and mount a different tree. Screenshot both phases.
- Do not write review screenshots to the repo root.
