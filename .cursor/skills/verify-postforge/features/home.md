# Home cockpit

Home is the production cockpit: glance stats, review/start-work affordances, and the shared workspace shell for the rest of the app.

## Sub-features

- `home-shell` shows workspace navigation and the PostForge brand.
- `home-heading` shows the route title `Home`.
- `home-glance` exposes today's glance region when present.
- `home-start` links into clone / generate / inspiration start paths without inventing data.

## How to get to it (user POV)

- Open `http://127.0.0.1:3000/` after launch.
- Choose the `Home` item in workspace navigation.
- Choose the `PostForge home` brand link from any shell route.

## Driving it with control-postforge

Preconditions:

- PostForge is healthy at `http://127.0.0.1:${PORT:-3000}`.
- `control-postforge doctor` exits 0.
- `PROOF_DIR` is set under `/tmp/postforge-verify-*`.

- **Open home.** Navigate to `/`. Run `control-postforge browser goto /`. The document shows `nav[aria-label="Workspace navigation"]` and a heading `Home`.
- **Confirm brand.** Assert the brand control. Run `control-postforge browser snapshot --aria --path "$PROOF_DIR/home/shell.aria.txt"`. The snapshot includes `PostForge home` and `Workspace navigation`.
- **Glance region.** When glance content is mounted, locate `section[aria-label="Today at a glance"]` (empty or populated counts are both valid; zeros are fine for empty DB, null/unavailable provider metrics must not be fabricated).
- **Start-work entry.** Prefer an in-page start link such as `Start a clone` or the header path to Clone. Run `control-postforge browser click --role link --name "Clone"` only if proving nav; for in-page proof click the visible start-work link text from the snapshot. The URL becomes `/ugc-clone` (or the chosen start target).
- **Return home.** Run `control-postforge browser click --role link --name "Home"` (or `--name` matching `PostForge home`). The heading reads `Home` again.
- **Proof.** Run `control-postforge browser screenshot --path "$PROOF_DIR/home/home.png" --viewport 1440x1024`. The image shows the shell and Home heading.

## Gotchas

- Empty databases still render Home; absence of glance numbers is not a failure when the region or empty copy is present.
- Do not treat missing fal/OAuth as a Home failure.
- Mobile proof needs `control-postforge browser resize --viewport 390x844` before a second screenshot; the sidebar may be collapsed behind `Open workspace navigation`.
