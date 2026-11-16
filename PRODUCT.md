# Product

## Platform

web

## Users

A single operator — the owner — running PostForge self-hosted for their own marketing. They use the dashboard directly for generation, review, automation, and analytics, and they drive the same platform through their own AI agent (OpenClaw/Clawdy) via the REST API for programmatic content production. Not built for other people today; a future audience is undecided.

## Product Purpose

PostForge is a self-hosted AI content platform for marketing the owner's apps on TikTok (and adjacent social platforms). It is the one-stop shop for the owner's AI marketing needs: generate media, package it into UGC and slideshow content, automate the pipeline, and understand cost and performance — all without renting middleman platforms (GenViral, Shorts Bro) or paying per-seat SaaS margins.

## Positioning

A self-hosted, single-owner content pipeline that calls AI model APIs directly via fal.ai instead of going through middleman platforms, giving full control over models, workflows, and cost. The differentiating claim is the integrated workflow: UGC + slideshow automation as a pipeline, with performance and cost analytics over the same connection system — not just a generation tool and not just a posting scheduler.

## Operating Context

- Self-hosted deployment, run locally and reachable on `localhost:3100` during development.
- The owner works inside the dashboard (web) and also hands work to their AI agent, which hits the platform's REST API programmatically.
- Direct fal.ai pay-per-call usage: image models (Nano Banana family), video models (Kling, Veo), and others are registered in a model registry; costs are logged per call.
- Storage is database-backed (Postgres) with a legacy disk backfill on boot.
- Content produced includes generated images/videos, UGC clone outputs, and slideshow/carousel projects.

## Capabilities and Constraints

Confirmed functionality:
- AI image and video generation across a model registry (Nano Banana 2 / Pro / Lite, Kling, Veo, and more), with async job queue (queued → processing → completed → failed).
- Output management: gallery, preview, download, collections.
- UGC clone studio (reference images, source clips, trim, download).
- Slideshow/carousel studio: story generation, per-slide editing, image generation per slide, reordering, duplicate, export.
- Characters / character library and builder.
- Automations: templates and builder with scheduling and publishing.
- Performance analytics and cost/spend tracking.
- Social integrations: TikTok, Instagram, YouTube — one server-owned connection system.
- Provider credentials / available models managed under Settings.

Confirmed constraints and invariants:
- Single user, no authentication today; authentication may be added later (undecided).
- One exception to "not built for other people": a public demo workspace, deployed separately with its own database and sample content for a fictional brand, so the product can be shown without exposing the owner's work. It is read-and-edit only (no generation, uploads, or provider connections), it is labelled as a demo, and it never fakes a Connection or provider metrics. See `docs/demo-workspace.md`.
- TikTok/Instagram/YouTube are one server-owned connection system; Settings controls the connection, Performance reads its owned-media metrics, Automations reads the same connection and granted publishing capability.
- Provider access/refresh tokens are never persisted in browser state, local storage, workspace-feature JSON, logs, URLs, or client-visible responses.
- A provider is connected only after its OAuth callback succeeds; missing credentials/scopes, refresh failures, and sync failures stay visible and are never replaced with demo accounts or synthetic metrics.
- Unavailable provider metrics remain unavailable (`null`), not zero. CSV imports stay a separate local data source.
- Publishing is always an explicit, approval-gated external mutation; a connected account without the provider's publishing scope stays unavailable as an automation destination.

## Brand Commitments

- Name: PostForge.
- Voice/identity: the platform should feel polished and great to use even though it is single-user; craft is an explicit commitment, not optional.
- **Standing visual preference: Workbench, charcoal and ember.** A forge burns charcoal. The workspace is stepped charcoal with bone text, and the only colour on the page is the ember. Subtraction is part of the design: the page header is the title only, the sidebar has no group labels, panels carry no captions, and status in dense places is an icon badge instead of a word.
- **Ember means live, bone is the one primary.** Ember (`#FF5B2E` dark, `#FF4A20` light) marks what is live, current or selected and never means "click me". The bone pill (`#F2F0EB` with ink text) is the one primary action on a screen. Green, amber and red are status only.
- Typography: Figtree for all UI type; Geist Mono only for ids, costs, timestamps and durations. Both are self-hosted.
- Default theme: dark. Light stays available through the theme toggle with the same roles. Design language is documented in `DESIGN.md`; the designs live in Paper (file `01M74DGFD1W8647F6RFTFTT93Q`, page "3 Workbench").

## Evidence on Hand

- Design language: `DESIGN.md` (canonical design authority).
- Product spec history: `PHASE1.md` (early phase; product has since expanded well beyond it).
- Screenshots of running surfaces in the repo root (e.g. `fixed-home.png`, `fixed-characters.png`, `pf-settings-models-1440.png`).

## Product Principles

1. Own the pipeline, not just the pixels: generation, packaging, automation, and analytics must work as one connected workflow.
2. Trust nothing you did not earn: real connections, real metrics, real approvals. No demo accounts, no synthetic data, no fabricated publishing.
3. Cost is first-class: direct fal.ai usage with per-call cost logging and spend visibility is core to the value proposition.
4. Self-hosted and controllable: the owner keeps full control over models, workflows, and data.
5. Polished by default: even for a single operator, the surface should feel great to use and hold a coherent design language.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established for this single-operator tool. Standard web accessibility best practices should still be maintained.
