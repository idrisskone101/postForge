# Visual regression

Catch first-paint and Lighthouse work that scores 100 while headings clip, borders drop, or buttons flatten.

## Sub-features

- 18 workspace routes at desktop `1440x1024` and mobile `390x844`.
- Overflow checks at first paint, after `window.load`, and after the first input on a deferred island.
- Screenshots land in `$VISUAL_PROOF_DIR` or `/tmp/postforge-visual-*`. Do not write them to the repo root.
- Heading tokens in `src/app/first-paint-css.ts` must match `DESIGN.md` display/headline sizes. `max-width: 8rem` on those headings fails.

## How to get to it (user POV)

Open any workspace route. The title should read at 28px or 30px without an 8rem clip. Primary actions should keep their border and width after the route hydrates.

## Driving it with control-postforge

```bash
control-postforge launch
control-postforge doctor
pnpm exec tsx scripts/check-first-paint-tokens.ts
LH_BASE="http://127.0.0.1:${PORT:-3000}" pnpm exec tsx scripts/visual-regression-sweep.ts
```

`pnpm kode:lighthouse` runs the token check and the sweep before Lighthouse. A green Lighthouse job cannot skip them.

## Gotchas

- Overflow on muted 10px copy is intentional first-paint clipping. The sweep only fails `h1`, home/character/policy titles, and primary buttons.
- Install Chromium once: `pnpm exec playwright install chromium`.
- Legal routes stay out of this sweep. They are scored by Lighthouse, not this map.
