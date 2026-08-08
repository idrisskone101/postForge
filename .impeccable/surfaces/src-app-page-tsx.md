---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/home-cockpit.tsx","src/components/sidebar.tsx","src/components/workspace-shell.tsx"]
---

## Scope

Shell + Home route (`/`), first surface of the whole-dashboard world replacement. The approved composition propagates to every other route in the goal loop.

## Visitor mode

Operate — single owner, daily morning scan: what is running, what needs review, what did it cost, what is next.

## Audience, job, action

Solo operator at a Mac. Job: scan pipeline state, review finished media, take the next action. Primary action: New Clone (coral, header right). Secondary actions: approve/reject inline in the review queue; click-through to jobs and media.

## Chosen direction

Canon — category-standard SaaS dashboard played straight at Linear/Resend craft level (standing preference, PRODUCT.md brand commitments). User-chosen from direction roll `c509faa7`. Zinc neutrals, white hairline cards, Geist + Geist Mono data voice, coral #FF4A20 reserved for primary action + active nav. Token-driven light + dark.

## Approved comp

`.impeccable/mocks/comp-a.png` (sidecar `comp-a.json`, approved: true). Composition: header (title, date, coral primary action) → four stat cards (Spend today, Jobs running, Awaiting review, Published this week) → two columns: Review queue 45% (rows: thumbnail, prompt snippet, model tag, approve/reject icon buttons) + Recent media 55% (2x3 grid, status badges). Sidebar: wordmark, PRIMARY/TOOLS groups, Settings at bottom, active row soft coral tint.

## Implementation-fidelity inventory (from the comp)

- Component grammar: white cards, 1px #E4E4E7 hairlines, 8px radii, shadow 0 1px 2px rgba(0,0,0,0.04); no borders stacked on borders.
- Type ramp: page title ~30px/600 tracking -0.02em; card titles 15px/600; stat numerals ~30px tabular; stat labels 11px uppercase tracked; body 13px; meta 12px #71717A.
- Spacing: 24px page gutters, 16px card padding, 12px between cards, 8px row gaps inside lists.
- Media: thumbnails are real generated assets (raster, existing `/api/files` pipeline); status badges = semantic HTML.
- Primary action: solid coral #FF4A20, white text, 8px radius — semantic HTML.
- Sidebar: 240px, white, right hairline; active row soft coral tint bg + coral text; groups labeled in 11px uppercase tracked gray; minimal line icons (existing lucide set); collapse behavior unchanged.
- Do NOT literalize: the comp's invented stat numbers, prompt texts, and thumbnail art (real data only); the wordmark lightning bolt (keep current wordmark); exact thumbnail crops.

## Constraints

- Sidebar position, groups, and expand/collapse behavior unchanged (user-pinned).
- All functionality preserved; only presentation changes. Unavailable metrics stay null, never zero (PRODUCT.md invariant).
- Responsive: review queue / recent media stack to one column < 1024px; stat strip 2x2 on mobile.

## Unresolved decisions

- Wordmark treatment (current bolt vs plain) — decide in build, keep current asset.
- Whether the home review queue duplicates gallery state or deep-links (check data source in build).
