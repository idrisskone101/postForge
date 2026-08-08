# PostForge agent instructions

## Skill precedence

- User-scope skills (`~/.agents/skills/`) take priority over project-scope skills (`.agents/skills/`) whenever names or directives conflict.
- Do not install a project-scope copy of a skill that already exists at user scope; the user-scope copy is the canonical one.
- **Design work is owned by the Impeccable skill** (`.pi/skills/impeccable`, invoked as `/impeccable`). It is the only design/direction skill loaded for frontend work. The legacy taste skills (`design-taste-frontend`, `minimalist-ui`, `high-end-visual-design`, `industrial-brutalist-ui`, `gpt-taste`, `brandkit`, `imagegen-*`, etc.) are archived at `.agents/skills-archive/taste-skills/`, intentionally outside the active discovery path so they cannot collide with Impeccable. Never blend Impeccable with another design vocabulary on the same surface.
- Follow the Impeccable setup: run `node .pi/skills/impeccable/scripts/context.mjs` once per session, load the one playbook that owns the request, and load `reference/craft-floor.md` immediately before editing UI.

## Design source of truth

- **Impeccable owns the design engine.** `DESIGN.md` is the canonical design-language authority for PostForge; keep it current with `/impeccable init` (one-time) and `/impeccable document` as the system drifts. `PRODUCT.md` holds the product context Impeccable reads on every command.
- MagicPath is the visual reference layer for parity QA, not a competing design generator. Keep the route-to-frame map in `docs/magicpath-visual-qa.md` current whenever a MagicPath frame or production route changes, and compare running UI against MagicPath frames during review.
- Reuse the shared PostForge design tokens and shell before introducing route-specific visual primitives.

## Required adversarial review

Every user-visible UI change must end with an independent **Adversarial Review** sub-agent. The reviewer must not be the agent that authored the implementation.

Run the review against an optimized production build (`pnpm build`, followed by `pnpm start`), not only the development server.

Run Impeccable's pre-ship gauntlet (`/impeccable score`, `copy`, and `stress-test`) on the affected surface and pipe its P0/P1 findings into this review. The review agent still stays independent and remains the mandatory gate.

The reviewer must:

1. Compare the running production code with its MagicPath frame at desktop (1440 x 1024) and mobile (390 x 844), then run responsive fit checks at 1280, 1024, and 768 CSS pixels wide.
2. Check layout, hierarchy, typography, color, spacing, borders, controls, responsive behavior, sidebar expansion/collapse, column fallbacks, fixed or sticky bars, safe areas, and loading, empty, error, and populated states.
3. Exercise the pre-redesign behavior contract for the affected route, including deep links, query parameters, mutations, handoffs, downloads, retries, and failure recovery.
4. Reject invented integrations or fabricated data. Disconnected services must remain explicit and functional local workflows must remain real.
5. Report findings with severity, route, reproduction steps, and screenshot or DOM evidence.

The implementing agent must fix every P0/P1 finding and rerun the reviewer. UI work is not complete until the reviewer confirms visual parity and no material functionality regression, followed by lint, typecheck, tests, and a production build.

## Integration system invariant

- TikTok, Instagram, and YouTube are one server-owned connection system. Settings controls a connection; Performance reads that connection's owned-media metrics; Automations reads the same connection and granted publishing capability.
- Never persist provider access or refresh tokens in browser state, local storage, workspace-feature JSON, logs, URLs, or client-visible responses.
- A provider is connected only after its OAuth callback succeeds. Missing credentials, missing scopes, refresh failures, and sync failures must stay visible and must never be replaced with demo accounts or synthetic metrics.
- Unavailable provider metrics remain unavailable (`null`), not zero. CSV imports stay a separate local data source.
- Publishing is always an explicit, approval-gated external mutation. A connected account without the provider's publishing scope must remain unavailable as an automation destination.
