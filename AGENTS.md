# PostForge agent instructions

## Skill precedence

- User-scope skills (`~/.agents/skills/`) take priority over project-scope skills (`.agents/skills/`) whenever names or directives conflict.
- Do not install a project-scope copy of a skill that already exists at user scope; the user-scope copy is the canonical one.

## Design source of truth

- `DESIGN.md` is the canonical design-language authority for PostForge, and `PRODUCT.md` holds the product context for design and implementation decisions.
- Reuse the shared PostForge design tokens and shell before introducing route-specific visual primitives.

## Required adversarial review

Every user-visible UI change must end with an independent **Adversarial Review** sub-agent. The reviewer must not be the agent that authored the implementation.

Run the review against an optimized production build (`pnpm build`, followed by `pnpm start`), not only the development server.

Before reviewing, read `DESIGN.md`, `PRODUCT.md`, the affected route, and the shared shell. Use those sources to establish the expected visual and behavioral contract.

The reviewer must:

1. Compare the running production code with `DESIGN.md`, the shared shell, and the affected route's intended state at desktop (1440 x 1024) and mobile (390 x 844), then run responsive fit checks at 1280, 1024, and 768 CSS pixels wide.
2. Check layout, hierarchy, typography, color, spacing, borders, controls, responsive behavior, sidebar expansion/collapse, column fallbacks, fixed or sticky bars, safe areas, and loading, empty, error, and populated states.
3. Exercise the pre-redesign behavior contract for the affected route, including deep links, query parameters, mutations, handoffs, downloads, retries, and failure recovery.
4. Reject invented integrations or fabricated data. Disconnected services must remain explicit and functional local workflows must remain real.
5. Report findings with severity, route, reproduction steps, and screenshot or DOM evidence.

The implementing agent must fix every P0/P1 finding and rerun the reviewer. UI work is not complete until the reviewer confirms design-system consistency and no material functionality regression, followed by lint, typecheck, tests, and a production build.

## Playwright session artifacts

`.playwright-cli/` and `.playwright-mcp/` are gitignored dumps from Playwright CLI/MCP (snapshots, screenshots, videos). Agent screenshots dropped in the repo root (`ugc-clone-*.png`, `pf-canon-*.png`, and similar) are also not app data. `scripts/prune-playwright-artifacts.sh` removes videos after 1 day, other Playwright files after 7 days, caps those folders at 20 MB, and deletes untracked image/video files from the repo root. It runs from `pnpm prune:playwright`, `codex:setup`, and Cursor `sessionStart`/`sessionEnd` hooks. Do not write review screenshots into the repository root.

## Integration system invariant

- TikTok, Instagram, and YouTube are one server-owned connection system. Settings controls a connection; Performance reads that connection's owned-media metrics; Automations reads the same connection and granted publishing capability.
- Never persist provider access or refresh tokens in browser state, local storage, workspace-feature JSON, logs, URLs, or client-visible responses.
- A provider is connected only after its OAuth callback succeeds. Missing credentials, missing scopes, refresh failures, and sync failures must stay visible and must never be replaced with demo accounts or synthetic metrics.
- Unavailable provider metrics remain unavailable (`null`), not zero. CSV imports stay a separate local data source.
- Publishing is always an explicit, approval-gated external mutation. A connected account without the provider's publishing scope must remain unavailable as an automation destination.

## Cursor Cloud specific instructions

PostForge is a single Next.js 16 app (pnpm, React 19) backed by Postgres via Prisma. There is no separate backend service; all APIs are Next.js route handlers under `src/app/api`.

### Services and startup

- Postgres is installed on the VM as the local `postgresql-16` cluster (not Docker; `docker` is not available here). It does not auto-start on a fresh boot. Start it before running the app, tests that hit the DB, or migrations: `sudo pg_ctlcluster 16 main start` (check with `pg_isready -h 127.0.0.1 -p 5432`). The `postforge` role/database and applied migrations persist in the VM snapshot. Cloud Agent boot uses `.cursor/environment.json` (`scripts/cloud-agent-install.sh` / `scripts/cloud-agent-start.sh`).
- `yt-dlp` is installed at `/usr/local/bin/yt-dlp` during Cloud Agent install so Clone can import TikTok URLs. Missing `yt-dlp` is a real Clone error, not a reason to stay on Inspiration. `ffmpeg` is already on the Cloud image.
- `.env` is gitignored and already created on the VM from `.env.example` with `DATABASE_URL=postgresql://postforge:postforge@localhost:5432/postforge` and `STORAGE_DRIVER="database"`. If `.env` is missing, recreate it: `cp .env.example .env`, then set `STORAGE_LOCAL_PATH` to a path under `/workspace` (the default in the example is a macOS path).
- After pulling new migrations, apply them with `pnpm exec prisma migrate deploy` (Postgres must be running first). `pnpm install` runs `prisma generate` automatically via `postinstall`.
- Dev server: `pnpm dev` (Turbopack, http://localhost:3000). The "middleware is deprecated" warning is expected and harmless. Production: `pnpm build` then `pnpm start`.

### Lint / typecheck / test / build

- Standard commands live in `package.json` scripts: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm dev`, `pnpm start`.
- `pnpm codex:check` (`scripts/codex-check.sh`) is the canonical full gate: it runs the entire `test:*` suite, then typecheck, lint, and a production build. It requires a running Postgres. Individual tests are the `test:*` scripts.
- Lint currently passes with warnings only (no errors); do not treat those pre-existing warnings as regressions.
- The tests are `tsx`-run assertion scripts (not a watch framework); most run without external services, and DB-dependent ones use the running local Postgres.

### pstack models

- The workspace file `.cursor/rules/pstack-models.mdc` is the source of truth. Every pstack role is `inherit-parent` (omit Task `model` so delegates stay on this chat's model).
- Cloud agents inject that workspace rule. pstack skills still read `~/.cursor/rules/pstack-models.mdc`. If that home copy is missing, run `bash scripts/install-pstack-models.sh` (also run from `pnpm codex:setup` and the `sessionStart` hook) before spawning pstack delegates.
- If a skill looks only at the home path and the file is still missing, treat `.cursor/rules/pstack-models.mdc` as that file.

### External integrations

- fal.ai, Ollama, TikTok/Instagram/YouTube, and Railway/S3 storage all require secrets that are absent by default. Core dashboard workflows (characters, collections, slideshow drafts, automation drafts, DB-backed persistence) work without them; only actual media generation and provider publishing/sync need those keys. Missing credentials must stay visibly unavailable — never substitute demo data.

### Linear MCP

- Linear's official HTTP MCP is declared in `.cursor/mcp.json` at `https://mcp.linear.app/mcp`. Use that Streamable HTTP URL. Do not wrap it with `npx mcp-remote`; Cloud Agents do not support that transport.
- Cloud Agents load Linear from the MCP dropdown on [cursor.com/agents](https://cursor.com/agents), not automatically from desktop MCP settings. Desktop OAuth and the Linear issue-delegation integration (`@Cursor` on issues) do not authorize Linear MCP tools inside a cloud VM.
- If Linear shows `needsAuth`, authenticate it from that Cloud Agents MCP dropdown. Interactive OAuth cannot run inside the cloud VM. Re-auth from desktop Settings → MCP is not enough.
