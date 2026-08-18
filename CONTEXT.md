# PostForge domain

Single-operator, self-hosted marketing pipeline. One owner generates media, packages it as Clone and Slideshow content, automates that pipeline, and reads cost and performance from the same Connection system.

## Glossary

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Owner** | The single operator of this self-hosted instance. | User, customer, tenant |
| **Generation Job** | A durable image or video generation attempt, queued through completed or failed. | Task, request, run |
| **Generated File** | A persisted output of a Generation Job. | Asset (when you mean job output), file (unqualified) |
| **Slideshow Project** | A sequenced set of slides the owner edits, generates, exports, or schedules. | Carousel, deck |
| **Slide** | One frame in a Slideshow Project. | Card, page |
| **Slide kind** | The slide’s place in the sequence: `hook`, `content`, or `cta`. | role, phase, body (as a kind) |
| **Character** | A reusable identity recipe (attributes, preview seed, optional Avatar link) stored as workspace JSON. | Profile, persona |
| **Avatar** | A persisted portrait plus identity pack (multi-angle stills) stored in Postgres. | Character image, identity photo |
| **Identity pack** | The set of generated stills that belong to an Avatar. | Reference set (when you mean pack images) |
| **Clone** | A motion-transfer production: TikTok source + Avatar/references → UGC output. | UGC (unqualified), replica |
| **Collection** | An owner-curated set of images used as references across Generate, Clone, and Slideshow. | Folder, album, library |
| **Connection** | A server-owned OAuth account for TikTok, Instagram, or YouTube. Settings writes it; Performance and Automations read it. | Social account, integration (in product copy) |
| **Workspace Automation** | A review-draft loop with an optional Connection destination; publishing is always approval-gated. | Automation (unqualified) |
| **Slideshow Automation** | A Prisma-backed generator that ticks Slideshow Projects on a schedule. It is not a Connection publisher. | Automation (unqualified) |
| **Slideshow Project status** | `draft`, `ready`, `scheduled`, `published`, `archived` may be written by the studio. `generating`, `exported`, and `failed` are server-owned and omitted on studio save. | Coercing those three to `draft` on save |
| **Cost Log** | A per-call spend record for a Generation Job. | Invoice, billing |

## Relationships

- A **Slideshow Project** contains ordered **Slides**.
- The Slideshow Project record is flat (kind, copy, visuals, job ids). Prisma `content` / `settings` / `layout` JSON is a persistence adapter, not the domain shape.
- Persistence reads legacy `role` and `phaseSettings.body`; it writes only `kind` and `phaseSettings.content`. GET does not emit `role`.
- Slideshow Project defaults: missing text size is 56; on-slide color tokens are the export overlay palette. Brand coral is not slide text.
- The Slideshow Project module is Prisma-free (`src/lib/slideshow/project.ts`). Prisma JSON mapping stays in the persistence adapter.
- Fal result persistence and durable submit live in Job modules; HTTP retry is a thin adapter over retry dispatch.
- Workspace Automation publish orchestration is a server module; the publish route is an HTTP adapter.
- Clone, Avatar import, and Generate studio workflow rules live in lib modules; UI modules present them.
- Collection join, asset URLs, and Pinterest candidate shape live in one read-model module.
- A **Character** may point at one **Avatar**; the link is conventional, not schema-enforced.
- An **Avatar** owns zero or more **Identity packs**.
- A **Clone** uses a TikTok source and an **Avatar** / references; it produces **Generation Jobs**.
- A **Connection** is shared by Settings, Performance, and Workspace Automation publishing.
- **Workspace Automation** and **Slideshow Automation** are distinct domains. They share a word, not storage, scheduling, or publishing.

## Flagged ambiguities

- **Automation** — resolved: always say **Workspace Automation** or **Slideshow Automation**.
- **Identity** — still fuzzy: clone UI copy, Identity pack, and Character builder all use it. Do not treat them as one term yet.
- **body** — the paragraph copy on a Slide, never a Slide kind. Story LLM `role: "body"` maps to **kind** `content` at the story adapter.
- **Asset** / **File** / **Reference** — still overloaded across Collection items, swap metadata, and Generated Files.

## Example dialogue

> **Dev:** "When a **Workspace Automation** fires, does it publish through the **Connection**?"
> **Owner:** "No. It prepares a review draft. Publishing is a separate, approval-gated mutation on that **Connection**."
> **Dev:** "And a **Slideshow Automation**?"
> **Owner:** "That only generates the next **Slideshow Project**. It never talks to TikTok."
> **Dev:** "If I accept an imported portrait, is that a **Character** or an **Avatar**?"
> **Owner:** "The portrait is the **Avatar**. The **Character** is the recipe that may point at it."
