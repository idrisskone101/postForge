# MagicPath production parity map

MagicPath project: [PostForge - ReelFarm Redesign](https://www.magicpath.ai/files/435052398810132480)

| Production surface | Route | MagicPath component | Revision |
| --- | --- | --- | --- |
| Shared design system | all workspace routes | `435052823424700416` | `435052823424700417` |
| Home | `/` | `435053921048870912` | `435513846518673408` |
| Inspiration | `/ugc-inspiration` | `435054032416018432` | `435054032420212736` |
| Clone studio | `/ugc-clone` | `435054749532983296` | `435054749532983297` |
| Slideshow studio home | `/slideshow` | `435413756852441088` | `435435892702842880` |
| Slideshow slide editor | `/slideshow` editor state | `435416307991719936` | `435418288860856320` |
| Clone output review | `/ugc-clone/[id]` | `435054738661343232` | `435054738661343233` |
| Gallery | `/gallery` | `435057987107835904` | `435057987107835905` |
| Spend | `/costs` | `435058034046300160` | `435058034046300161` |
| Generate studio | `/generate` | `435054350382039040` | `435547714965622784` |
| Generation editor | `/generate/[id]` | `435054353376751616` | `435054353376751617` |
| Automations | `/automations` | `435056674701717504` | `435438532786552832` |
| Automation templates | `/automations/new` template modal | `435056693118922752` | `435056693118922753` |
| Automation builder | `/automations/new` | `435056693525774336` | `435056693525774337` |
| Performance | `/performance` | `435056679864922112` | `435056679864922113` |
| Image collections | `/collections` | `435056677155393536` | `435440550880096256` |
| Character library | `/characters` | `435056646067212288` | `435056646067212289` |
| Character builder | `/characters/new` | `435057651588673536` | `435057651588673537` |
| Settings and integrations | `/settings` | `435056692204552192` | `435056692204552193` |

## Visual QA path

For every affected route:

1. Build PostForge with `pnpm build`, start it with `pnpm start`, then open the latest submitted MagicPath revision and the running production route side by side.
2. Capture 1440 x 1024 and 390 x 844 screenshots with the same state and scroll position. Also measure fit at 1280, 1024, and 768 CSS pixels wide; the intermediate checks can use DOM/layout evidence when a screenshot adds no information.
3. Compare global rail, collapsed rail, content width, top hierarchy, typography, spacing, colors, radii, borders, shadows, imagery, icons, control sizing, column fallbacks, fixed/sticky bars, bottom safe areas, and responsive reflow.
4. Exercise loading, empty, error, and populated states. Exercise menus, dialogs, filters, route/query state, create/edit/delete actions, and cross-tool handoffs.
5. Record every mismatch as P0 (blocking/data loss), P1 (material visual or functional regression), P2 (minor mismatch), or P3 (polish).
6. After fixes, repeat the full affected path. Do not accept a source-only review as visual evidence.

For every width, assert `document.documentElement.scrollWidth === document.documentElement.clientWidth` unless a deliberately scoped horizontal scroller is being exercised. Any scoped scroller must remain clipped to its own bounds and must not increase document width.

## Preserved behavior contract

- The sidebar, mobile sheet, theme control, route headers, and all existing deep links remain available.
- Inspiration preserves creator tracking and refresh/delete, filters, source preview fallbacks, copy/open, and Clone handoff with `sourceId`.
- Clone preserves all three steps, trimming, imported/saved sources, avatar modes and identity packs, references, model/audio/text settings, validation, errors, query cleanup, polling, retry, download, details, and review feedback.
- Gallery preserves filters, grid/list, inspector, selection, status actions, downloads, handoffs, deletion, bulk actions, and visible feedback.
- Spend preserves `period=7d|30d|90d`, KPIs, charts, logs, CSV, pagination, and loading/empty/error states.
- Generate preserves prompt and model prefills, model-specific fields, avatar and advanced controls, estimates, validation, polling, variants, editor tabs, retry, download, Gallery/similar/discard actions, and mobile behavior.
- Generate video continuity: a server-owned output (video or image) can seed the next video through the Character continuity step. Videos get their first frame extracted server-side; images are used directly. The i2v model (`kling-3.0-i2v`) is selected automatically when a seed is picked, `?referenceFileId=` deep links prefill it, the editor offers "Continue this video" for completed video jobs, and seeds are mutually exclusive with character identity and visual collection references. Provider URLs are never persisted inputs; only the owned file id is.
- New Automation, Performance, Collection, Character, and Settings capabilities persist real local data.
- Character Builder preserves all 36 appearance groups in its saved recipe and generated-photo prompt. A changed recipe cannot be saved against a stale portrait; legacy or edited recipes must be rendered again before save.
- Manual Automation runs create real image-generation jobs in the Review queue. Local schedules are opt-in, timezone-aware, idempotent per slot, and require a continuously running PostForge server; they never publish to a social provider.
- TikTok, Instagram, and YouTube connection state is shared across Settings, Performance, and Automations. Missing configuration, missing scopes, token refresh errors, and sync errors remain explicit; provider data is never fabricated.
- Provider tokens remain server-only and encrypted at rest. Performance preserves unavailable metrics as unavailable, while CSV imports remain a separate local data source.
- External publishing is a separate, approval-only action from an Automation. It accepts only that workflow's generated Gallery video while it is still marked **Approved output**, revalidates the bound account and publishing scope on the server, shows a provider-specific final review, and requires fresh explicit consent. The scheduler never invokes this action.
- TikTok publishing must use the live creator controls returned by TikTok: no default privacy choice, interaction controls default off and honor creator restrictions, commercial disclosure stays off until selected, and the Music Usage Confirmation and applicable Branded Content Policy declarations remain linked and explicit. Requested privacy must never be mislabeled as provider-confirmed privacy.
- Instagram Reel and TikTok pull publishing use short-lived, provider-bound signed media URLs. YouTube resumable session URLs and every provider token remain encrypted server-only state; none may enter browser storage, workspace-feature JSON, logs, or client-visible responses.
- A publication stores its provider acceptance and processing state before any irreversible or resumable boundary. Concurrent status recovery is leased per attempt; unresolved publications lock their exact provider account, approved asset, and identity-changing workflow edits. Safe pre-provider claims are recoverable after interruption, while an unknown provider outcome is never retried automatically.
- Provider status refresh must resume only documented-safe work, preserve the provider's actual visibility when returned, and distinguish terminal failure from an ambiguous outcome. Disconnect, OAuth account replacement, asset deletion, and approval changes are rejected while they could strand an unresolved publication.
- The shared shell, loading and empty states, dialogs, fixed feedback, tables, cards, calendars, and long unbroken content must reflow from 320 CSS pixels through desktop widths without document-level overflow. The sidebar may collapse without a first-paint geometry jump, and deliberate horizontal scrolling must stay inside its owning component.
