# PostForge agent instructions

## Design source of truth

- MagicPath is the source of truth for PostForge product design.
- Keep the route-to-frame map in `docs/magicpath-visual-qa.md` current whenever a MagicPath frame or production route changes.
- Reuse the shared PostForge design tokens and shell before introducing route-specific visual primitives.

## Required adversarial review

Every user-visible UI change must end with an independent **Adversarial Review** sub-agent. The reviewer must not be the agent that authored the implementation.

Run the review against an optimized production build (`pnpm build`, followed by `pnpm start`), not only the development server.

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
