# Visual regressions

Catch first-paint and Lighthouse work that scores well while headings clip, borders drop, buttons flatten, spacing collapses, or navigation feels slower. A green Lighthouse score is not proof.

## Sub-features

- 18 workspace routes at desktop `1440x1024` and mobile `390x844`.
- Overflow checks at first paint, after `window.load`, and after the first input on a deferred island.
- Screenshots land in `$PROOF_DIR`, `$VISUAL_PROOF_DIR`, or `/tmp/postforge-visual-*`. Do not write them to the repo root.
- Heading tokens in `src/app/first-paint-css.ts` must match `DESIGN.md` display/headline sizes. `max-width: 8rem` on those headings fails.
- Text overflow, borders, button chrome, and spacing against `DESIGN.md`.
- Sidebar navigation feel and `prefetch` on primary links.
- Shared-shell check: if `first-paint-css.ts`, `WorkspaceShell`, or `dashboard.css` load timing changed, sweep every visible workspace route, not only the edited page.

## How to get to it (user POV)

Open the production dashboard the way a user does. Walk the sidebar. The title should read at 28px or 30px without an 8rem clip. Read headings and empty-state copy. Click primary and secondary buttons. Primary actions should keep their border and width after the route hydrates. Wait for the page to finish loading, then look again.

## Driving it with control-postforge

```bash
control-postforge launch
control-postforge doctor
pnpm exec tsx scripts/check-first-paint-tokens.ts
LH_BASE="http://127.0.0.1:${PORT:-3000}" pnpm exec tsx scripts/visual-regression-sweep.ts
```

`pnpm kode:lighthouse` runs the token check and the sweep before Lighthouse. A green Lighthouse job cannot skip them.

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

Pass only if the token check, the sweep, and every item in the Visual regressions checklist in `SKILL.md` are clean. Treat failures as P0/P1.

## Gotchas

- First-paint CSS often pins `8rem` / `12rem` and `overflow: hidden`. Visible text may live in `sr-only` until `dashboard.css` loads. If the clip is still there after load, it is a product bug, not an acceptable LCP trick.
- Overflow on muted 10px copy is intentional first-paint clipping. The sweep only fails `h1`, home/character/policy titles, and primary buttons.
- Deferred islands (`ssr: false` after `window.load` or first input) can hide a static shell and mount a different tree. Screenshot both phases.
- Install Chromium once: `pnpm exec playwright install chromium`.
- Legal routes stay out of the automated sweep. They are scored by Lighthouse, not this map.
- Do not write review screenshots to the repo root.
