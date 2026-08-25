# PostForge verification map

This directory is the maintained source for verifying user-facing PostForge behavior. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch production PostForge with `control-postforge launch` (or `pnpm build` + `pnpm start`) at `http://127.0.0.1:${PORT:-3000}`.
- `POSTFORGE_API_KEY` is empty so the browser needs no auth header.
- Postgres is up; `STORAGE_DRIVER=database` (or a disposable local path under `/workspace`).
- `control-postforge doctor` exits 0.
- Put `.cursor/skills/verify-postforge/bin` on `PATH`.
- Set `PROOF_DIR=/tmp/postforge-verify-$RUN_ID` and keep artifacts there.
- Never drive an instance that was not started by this verification run.
- Do not require fal.ai, OAuth, Virlo, or Ollama for the mapped core workflows.

## Driving conventions

- Start every recipe from the baseline unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or DOM position. The app has no `data-testid`.
- Treat every command as literal.
- Run browser actions through `control-postforge browser`.
- Restore or uniquely name fixture data after mutations. Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- Handoff and navigation recipes need temporal proof (`waitForURL` or `RecordScreen`), not a destination screenshot after a separate goto.
- UI proof includes an ARIA snapshot and a screenshot with PostForge identity visible (`PostForge home` brand or route `h1`).
- Mutation proof includes a second user-facing read of the stored value.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Unavailable integrations (Generate media, connected social metrics) must remain unavailable — never invent demo data.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with control-postforge`
4. `Gotchas`

## Features

- [Home cockpit](./home.md) — glance stats, start-work cards, shell identity.
- [Inspiration](./inspiration.md) — tracked sources, Use in Clone handoff to Clone.
- [Characters](./characters.md) — library empty/populated, builder open/save path.
- [Collections](./collections.md) — library empty state and upload entry.
- [Slideshow drafts](./slideshow.md) — studio Create/Drafts tabs and new slideshow entry.
- [Automations and Settings](./automations-settings.md) — automation hub/builder and settings tabs.
- [Visual regressions](./visual-regression.md) — overflow, borders, buttons, spacing, first-paint vs load, nav prefetch. Required after first-paint or Lighthouse work.
