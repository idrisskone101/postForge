---
name: verify-postforge
description: "Drive the PostForge Next.js dashboard the way a user does — launch production, doctor health, exercise mapped routes with Playwright against ARIA handles, and capture proof under /tmp. Use when proving UI changes, regressions, or adversarial review claims for PostForge."
---

# Verify PostForge

Project-local verification for the PostForge web dashboard. Read this cold mid-task: launch the real app, drive a mapped feature through the browser, capture evidence, then clean up without deleting proof.

## Surface

- **Primary:** Next.js 16 dashboard at `http://127.0.0.1:$PORT` (default `3000`).
- **Secondary:** REST handlers under `/api/*` (use for health and side-effect checks; do not substitute API calls for user-path proof).
- **Auth:** Leave `POSTFORGE_API_KEY` empty for local verification. If a key is set, every page needs `Authorization: Bearer <key>`.

Core workflows that work without fal/OAuth secrets: Home, Characters, Collections, Slideshow drafts, Automations drafts, Settings. Generation/publish/sync stay visibly unavailable — never invent connected accounts or metrics.

## Launch

Prefer the production path (same as adversarial UI review):

```bash
sudo pg_ctlcluster 16 main start   # or: docker compose up -d postgres
pg_isready -h 127.0.0.1 -p 5432

# .env from .env.example if missing; STORAGE_LOCAL_PATH under /workspace when using disk storage
# DATABASE_URL=postgresql://postforge:postforge@localhost:5432/postforge
# STORAGE_DRIVER=database
# POSTFORGE_API_KEY=
# PORT=3000

pnpm exec prisma migrate deploy
pnpm build
PORT="${PORT:-3000}" pnpm start
```

Ready when:

```bash
curl -sS "http://127.0.0.1:${PORT:-3000}/api/health"   # → {"status":"ok"}
curl -sS -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:${PORT:-3000}/"   # → 200
```

UI ready marker: `getByRole('navigation', { name: 'Workspace navigation' })` and `a[aria-label="PostForge home"]`.

Helper (recommended):

```bash
export PATH="$PWD/.cursor/skills/verify-postforge/bin:$PATH"
control-postforge launch          # builds if needed, starts production on PORT
control-postforge doctor          # must exit 0 before driving
```

Dev shortcut (`pnpm dev`) is fine for iterate-only checks; treat `pnpm build` + `pnpm start` as the proof standard.

## Doctor

```bash
control-postforge doctor
```

Confirms: Postgres accepting connections, `/api/health` is `ok`, `/` returns 200, workspace navigation is present, and the process owning `$PORT` matches the PID file from this run's launch. Refuse to drive an instance you did not start.

## Drive

Use Playwright via the helper (Chrome channel when available). Prefer ARIA roles, `aria-label`, and nav hrefs — the app has **no `data-testid`**.

```bash
control-postforge browser goto /
control-postforge browser click --role link --name "Characters"
control-postforge browser snapshot --aria --path "$PROOF_DIR/characters.aria.txt"
control-postforge browser screenshot --path "$PROOF_DIR/characters.png"
```

Nav map (literal `aria-label` on sidebar links):

| Label | Path |
|-------|------|
| Home | `/` |
| Jobs | `/jobs` |
| Inspiration | `/ugc-inspiration` |
| Clone | `/ugc-clone` |
| Slideshow | `/slideshow` |
| Gallery | `/gallery` |
| Automations | `/automations` |
| Performance | `/performance` |
| Spend | `/costs` |
| Generate | `/generate` |
| Collections | `/collections` |
| Characters | `/characters` |
| Settings | `/settings` |

Shell landmarks: `#workspace-sidebar`, `#workspace-shell`, `nav[aria-label="Workspace navigation"]`, `a[aria-label="PostForge home"]`.

Feature recipes live in [features/](features/README.md). Start from the index; drive the matching file end to end.

## Evidence

```bash
RUN_ID="$(date +%Y%m%d-%H%M%S)-$$"
export PROOF_DIR="/tmp/postforge-verify-$RUN_ID"
mkdir -p "$PROOF_DIR"
```

Proof standards:

- Exercise the real user path (sidebar / header CTA / in-page CTA), not internal setters or test-only endpoints.
- Capture the action and the resulting state (ARIA snapshot + screenshot), not only the final screen.
- Confirm side effects when the feature mutates (reload / second view / list row).
- Viewports: desktop `1440x1024`, mobile `390x844`; responsive widths `1280`, `1024`, `768` when layout is in scope.
- Never write screenshots to the repo root (pruned and forbidden by `AGENTS.md`). Prefer `$PROOF_DIR` under `/tmp`. `.playwright-cli/` / `.playwright-mcp/` are allowed but auto-pruned.

## Cleanup

```bash
control-postforge cleanup
```

Stops only the PID recorded by `control-postforge launch`. Does **not** delete `$PROOF_DIR` or other proof artifacts. Does not drop the shared Postgres database.

## Isolate

- Second HTTP instance: `PORT=3001 NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3001 POSTFORGE_PUBLIC_URL=http://127.0.0.1:3001 control-postforge launch`.
- Data shares the default `postforge` database unless you set a separate `DATABASE_URL` and migrate it. Prefer unique fixture names and cleanup mutations over assuming isolation.
- Never drive a shared interactive session you did not start.

## Helpers

| Command | Purpose |
|---------|---------|
| `control-postforge launch` | Ensure Postgres, migrate, build once, start `pnpm start`, write PID/state |
| `control-postforge doctor` | Read-only health + shell presence |
| `control-postforge browser …` | goto / click / fill / snapshot / screenshot / resize |
| `control-postforge cleanup` | Kill launched PID; keep proof dirs |

Install Playwright browsers once per machine if the helper reports missing Chromium:

```bash
pnpm dlx playwright install chromium
```

## Related

After the map drifts, run `/maintain-verification-skill` against this skill.
