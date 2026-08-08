---
name: PostForge
description: The calm category-standard SaaS dashboard, executed at Linear and Resend craft level.
colors:
  primary: "#FF4A20"
  primary-deep: "#E9421C"
  primary-bright: "#FF6540"
  canvas: "#FAFAFA"
  surface: "#FFFFFF"
  surface-dark: "#131316"
  canvas-dark: "#0A0A0B"
  foreground: "#18181B"
  foreground-dark: "#FAFAFA"
  muted: "#71717A"
  muted-dark: "#A1A1AA"
  border: "#E4E4E7"
  border-dark: "#26262B"
  border-strong: "#D4D4D8"
  border-strong-dark: "#3A3A40"
  rail: "#FFFFFF"
  rail-dark: "#0A0A0B"
  rail-accent: "#FFF1EC"
  rail-accent-dark: "#2A1710"
  rail-accent-foreground: "#E9421C"
  rail-accent-foreground-dark: "#FF8A70"
  muted-surface: "#F4F4F5"
  muted-surface-dark: "#1C1C20"
  link: "#2563EB"
  link-dark: "#6AA7FF"
  success: "#16A34A"
  success-dark: "#4ADE80"
  danger: "#DC2626"
  danger-dark: "#F87171"
  lamp-amber: "#D97706"
  lamp-amber-dark: "#FBBF24"
typography:
  display:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline-sm:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline-xs:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.35
  meta:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.08em"
    textTransform: "uppercase"
  data:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontVariantNumeric: "tabular-nums"
    letterSpacing: "-0.01em"
rounded:
  sm: "6px"
  md: "8px"
  pill: "999px"
spacing:
  hairline: "1px"
  xs: "3px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.primary-bright}"
    textColor: "#FFFFFF"
  button-primary-active:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#FFFFFF"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "16px 20px"
  nav-item-active:
    backgroundColor: "{colors.rail-accent}"
    textColor: "{colors.rail-accent-foreground}"
    rounded: "{rounded.md}"
    height: "38px"
  status-pill:
    backgroundColor: "{colors.muted-surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
---

# Design System: PostForge

## Overview

**Creative North Star: "The Category Standard, Owned"**

PostForge is a calm professional instrument: the category-standard SaaS dashboard executed at the Linear and Resend craft bar. Restraint and clarity are the identity. There is no creative metaphor to invent — the canon is the choice, made deliberately by the user over the metaphor worlds (print shop, rack, nixie). The operator's media, pipeline state, and spend carry all the color; the chrome around them stays quiet zinc. This surface should read as belonging next to Linear and Resend, not as a theme.

Density is comfortable-professional: hairline-bordered cards, a compact sidebar, a quiet route header, and a stat strip that reads at a glance. Every decision favors legibility and low noise over decoration. Corners are gently curved (8px), shadows are quiet and offset, and motion is one quick-but-weighty ease shared across the whole system. Nothing competes for attention with the work.

Across the full 12-surface redesign the canon settled into a set of shared, token-driven primitives: a single dark media stage for every focus surface, corner status badges on media, coral selection rings and a docked bulk-action bar, a real table grammar for list views, and segmented controls for filters and step navigation. These recurring patterns — not per-route invention — are what define the system's feel.

**Key Characteristics:**
- Token-driven zinc-neutral light + dark themes; no per-route color invention and no literal hexes in component code.
- One coral accent (`#FF4A20` light / `#FF6540` dark) reserved for primary actions and active navigation — nothing else.
- A single dark media stage (`#09090B`) where all focused media renders object-contain/full-frame.
- Hairline-bordered cards (8px radius) with quiet, top-lit elevation.
- Geist carries all UI type; Geist Mono is reserved for true data (counts, costs, job ids, dates).
- A single shared motion ease (`cubic-bezier(0.22,1,0.36,1)` at 180ms) — no bounce.

## Colors

Zinc neutrals form the canvas and chrome; a single coral accent carries intent; semantic state colors (green/amber/red) are reserved for pipeline status only.

### Primary
- **Coral** (`#FF4A20` light, `#FF6540` dark; hover `#E9421C`): the platform's only brand accent. Used exclusively for primary action buttons, the quick-action in the mobile bar, active nav icons, focus rings, and the sidebar brand mark. Its rarity is the point.

### Neutral
- **Canvas** (`#FAFAFA` light, `#0A0A0B` dark): the page floor and route-header background.
- **Surface** (`#FFFFFF` light, `#131316` dark): cards, panels, secondary buttons, popovers.
- **Muted Surface** (`#F4F4F5` light, `#1C1C20` dark): pressed/hover rows, secondary fills, stat-card hover beds, segmented-control beds.
- **Foreground** (`#18181B` light, `#FAFAFA` dark): primary text.
- **Muted** (`#71717A` light, `#A1A1AA` dark): secondary text, labels, meta, inactive icons.
- **Border** (`#E4E4E7` light, `#26262B` dark): hairlines around cards, rows, controls.
- **Border Strong** (`#D4D4D8` light, `#3A3A40` dark): card hover stroke.
- **Rail** (`#FFFFFF` light, `#0A0A0B` dark): sidebar and mobile top bar surface.
- **Rail Accent** (`#FFF1EC` light, `#2A1710` dark): the active nav row bed and the selected-row tint — a pale coral wash, never the full accent.
- **Rail Accent Foreground** (`#E9421C` light, `#FF8A70` dark): text of the active nav row and selected rows.

### State
- **Success** (`#16A34A` light, `#4ADE80` dark), **Danger** (`#DC2626` light, `#F87171` dark), **Lamp Amber** (`#D97706` light, `#FBBF24` dark): pipeline status — approved, rejected/failed, in-progress. Used in status pills, lamps, small review dots, and media-corner badge dots.
- **Link** (`#2563EB` light, `#6AA7FF` dark): inline links in the sidebar footer.

### Named Rules
**The One Accent Rule.** Coral appears only on primary actions and active navigation. It is never used as a decorative flourish, a chart series, an idle icon, or a text highlight. When a surface needs more color, the operator's media and status provide it — the chrome does not.

**The Content Carries Color Rule.** The interface stays zinc. All chromatic meaning beyond the single coral accent is delegated to pipeline state (green/amber/red) and to the media itself. If a panel looks colorless, that is correct; the work supplies the color.

**The No-Literal-Hex Rule.** Every route is token-driven in both themes. No literal hex color appears in component code; the only accepted literals are the `#09090B` media stage, the slide-theme palettes in the slideshow, and the `TEMPLATE_VISUALS` gradient maps (content, not chrome). The legacy dark hex-remap tables in `globals.css` remain only as a transition safety net for any literal that slips in.

## Typography

**Display/Body Font:** Geist (with Inter, ui-sans-serif, system-ui fallbacks)
**Data Font:** Geist Mono (with ui-monospace, SFMono-Regular, Menlo fallbacks)

**Character:** A single humanist-geometric sans carries the whole interface at tight tracking; a mono face is reserved for numerals and identifiers. The pairing reads calm and technical — Linear-like clarity, no flourish.

### Hierarchy
- **Display** (600, 30px, line-height 1.1, tracking -0.02em): the Home page title.
- **Headline** (600, 28px, line-height 1.1, tracking -0.02em): the route header title in `WorkspaceRouteHeader`.
- **Headline-sm** (600, 24px, line-height 1.15, tracking -0.02em): secondary page titles.
- **Headline-xs** (600, 20px, line-height 1.2, tracking -0.02em): card-level emphasis, the top-model stat.
- **Title** (600, 15px, tracking -0.01em): card headers and section titles (`pf-section-title`) — "Review queue", "Recent media", "In progress".
- **Body** (500, 13px, line-height 1.35): row titles, list content.
- **Meta** (400, 12px, line-height 1.4): secondary lines under titles, table cells, meta rows.
- **Label** (600, 11px, tracking 0.08em, uppercase): group labels, stat-card labels, section labels, footer meta.
- **Data** (Geist Mono, tabular-nums, tracking -0.01em): job ids, counts in badges, costs, dates. Reserved for true data, never decorative.

### Named Rules
**The Data Voice Rule.** Geist Mono is reserved for true data: identifiers, counts in badges, costs in logs, dates. It is never used as costume or for labels — mono carries meaning only where the value is the content.

**The Sans Stat Rule.** Stat numerals are 28px semibold tabular-nums in the sans face — never mono. Geist Mono is reserved for true data (job ids, cost logs), not for headline figures. The tabular-nums feature gives the figures their alignment; the sans face keeps them part of the UI voice.

**The No-Eyebrow Rule.** Eyebrow/kicker text above page titles is banned everywhere. The route header carries the title, a one-line description, and the primary action only — no `pf-masthead-plate` remains in use.

## Layout

The shell is a fixed left sidebar (240px at xl, `xl:w-64`) plus a content viewport that margin-offsets by the sidebar width. The sidebar collapses to a compact rail (72px) at desktop, expanding via a header toggle (state persisted to `postforge-sidebar-collapsed`); below `md`, it becomes a slide-in sheet triggered from a 58px mobile top bar. Route content is centered in a `max-w-[1280px]` container with `px-4`/`sm:px-6`/`lg:px-8` gutters.

The route header is a hairline-banded band: a 28-30px/600 tracked title, a 13px muted one-line description, and a coral primary action on the right. Home composes a quiet header, a `grid-cols-2` stat strip that expands to 4 columns at `min-[860px]`, then the review queue and recent media side by side at `min-[1024px]` (9fr/11fr), then "In progress" and the start-action cards.

Spacing rhythm is tight and consistent: card padding `16px` (`p-4`) with `20px` (`p-5`) at small screens; gaps of `12px` (`gap-3`) between cards; `8px` (`gap-2`) inside tiles and rows; `3px` (`gap-0.5`/`gap-1.5`) between sibling nav rows and inline controls. Hairline borders (1px) separate list rows.

Filter and toolbar controls sit in a hairline card directly above the content. When items are selected, a **docked contextual bulk-action bar** appears as a hairline card immediately under the filter controls — never a floating overlay. It leads with a coral count chip, quiet text actions, and the danger action pushed far right.

### Named Rules
**The Docked Bulk Bar Rule.** The contextual bulk-action bar is a hairline card docked directly under the filter controls — never a floating overlay or a detached toolbar. It leads with a coral count chip, keeps actions as quiet text, and pushes the destructive action to the far right.

## Elevation & Depth

Depth is conveyed through a quiet, top-lit shadow scale plus hairline borders — a hybrid of tonal layering and soft elevation. Surfaces sit flat at rest; shadows rise only on hover and on the primary action. Shadows are always neutral, offset, and softly blurred; there are no zero-offset colored halos.

### Shadow Vocabulary
- **Tiny** (`0 1px 2px rgba(0,0,0,0.04)` light; darker in dark theme): resting elevation for stat cards, secondary buttons, hairline cards, segmented-control active pills.
- **Small** (`0 1px 2px rgba(0,0,0,0.05), 0 4px 12px -2px rgba(0,0,0,0.08)`): quiet raised elements.
- **Medium** (`0 1px 2px rgba(0,0,0,0.06), 0 8px 24px -6px rgba(0,0,0,0.12)`): card hover, media tile hover.
- **Large** (`0 2px 4px rgba(0,0,0,0.06), 0 16px 40px -12px rgba(0,0,0,0.16)`): the tallest float.
- **Coral** (`0 1px 2px rgba(130,25,0,0.15), 0 4px 12px -4px rgba(255,74,32,0.28)`): reserved for the primary button and the sidebar brand mark.

### Named Rules
**The Quiet-Shadow Rule.** All elevation is neutral, offset from the top light source, and softly blurred. Never a zero-offset block shadow and never a colored halo. The only colored shadow is the coral one on the primary action.

## Shapes

The form language is gently rounded corners on a 0.5rem base. Cards, buttons, inputs, nav rows, and media tiles share an 8px radius (0.5rem); small icon buttons and the brand tile use 6-8px (`rounded-[6px]`/`rounded-[7px]`/`rounded-[8px]`). Status pills, media-corner badges, and lamps are fully round (999px). Borders are uniform 1px hairlines that separate surface from canvas and rows from one another. There is no clipping, no torn/tear geometry, and no rotated stamp shapes in the canon — corners are soft, edges are straight hairlines.

## Components

### Buttons
- **Shape:** gently rounded (8px).
- **Primary (`.pf-button-primary`):** coral fill (`var(--pf-orange)`), white 13px/600 text, min-height 38px, horizontal padding 14px, coral shadow. Hover darkens via `brightness(0.93)`; active scales to `0.98` and darkens to `0.88`; disabled drops to 45% opacity with no shadow. There is no lift and no inset press shadow — the press is a flat scale. This is the only element that may carry coral fill.
- **Secondary (`.pf-button-secondary`):** surface fill, 1px hairline border, ink text, 36px min-height, 12px horizontal padding, tiny shadow. Hover tints with the muted-surface bed.
- **Ghost (in the mobile bar, sidebar):** icon-only 36px, muted icon that inks on hover over a muted-surface bed.

### Inputs / Fields
- **Style:** hairline border (`var(--pf-border)`), rounded-lg (8px), surface background, 13px ink text.
- **Focus:** the border shifts to coral and a soft coral ring appears (`ring` at 10-15% opacity) — a quiet glow, never a hard outline.
- **Search fields** sit inside a hairline-bordered label with a leading search icon and muted placeholder.

### Cards / Containers
- **Corner Style:** 8px radius.
- **Background:** surface (`var(--pf-surface)`).
- **Shadow:** resting `--pf-shadow-2xs`; hover lifts to `--pf-shadow-md` with a border-strong stroke and `translateY(-1px)` (via `.pf-card-hover`).
- **Border:** 1px hairline (`var(--pf-border)`).
- **Internal Padding:** 16px, growing to 20px on small+ screens. Card headers use a 15px/600 title with an optional quiet right-aligned link (12px, muted, inks on hover, arrow nudges right).

### Chips / Status Pills
- **Style (`.pf-status-success/warning/danger`):** fully round (999px) pills — a thin colored-tinted border, a very light tinted fill, and a 600-weight label in the matching hue, with an optional status lamp or check mark.
- **State:** processing = amber with a pulsing lamp; queued/idle = hairline border on a muted bed; complete = green with a check.

### Media-Corner Badge
- **Style:** a fully round (999px) pill on the media tile corner, `bg-black/55` with white 11px text and a colored status dot. The dot is green (`#4ADE80`) for approved, red (`#F87171`) for rejected, amber (`#FBBF24`) for needs-review. A duration chip uses the same black/55 pill on the opposite corner.
- **Reviewed cards** additionally carry a `.pf-review-stamp` pill (uppercase 11px, tinted fill) pressed onto the media corner; a user-driven review triggers the `.pf-stamp-slam` one-shot scale animation (expo-out ease only).

### Segmented Controls
- **Style:** a muted-surface bed (`--pf-active`) with `p-1`, containing equal-width segments. The active segment is a surface pill (`--pf-surface`) with the tiny shadow (`--pf-shadow-2xs`); inactive segments are muted text that ink on hover.
- **Use:** gallery review filters, model type tabs, clone step navigation.

### Table / List Rows
- **Style:** a real table grammar — a header row (hidden below `md`), hairline row dividers, hover on the muted-surface bed, 40px media thumbs, status pills, and right-aligned row actions. The gallery list view is the canon list pattern.

### Navigation (`.pf-nav-item`)
- **Style:** 38px rows, 13px/500, rounded 8px, `gap-2.5`. Icons are 17px at 1.8 stroke.
- **Default:** muted text and icon; hover inks over a muted-surface bed.
- **Active:** the pale coral wash bed (`rail-accent`) with coral text and a coral icon — the tinted wash, not the full accent, so the primary action stays the sole solid-coral element.
- **Group labels:** 11px/600 uppercase tracked 0.08em, muted, above each group.
- **Behavior:** collapses to a centered 72px icon rail at xl; becomes a slide-in sheet below `md`.

### Stat Cards
- **Layout:** 8px hairline card with an 11px uppercase tracked label and a 28px tabular-numeral value in ink (sans, not mono). Hover strengthens the border to `border-strong`. A hairline card, never a filled or shadowed tile.

### Media Tile
- **Layout:** square (aspect-ratio 1) 8px media thumbnail with a hairline border. On hover it lifts with the medium shadow. State pills (black/55 bed, white 11px) sit on the bottom-left corner; a duration chip sits bottom-right.

### The Dark Media Stage
- **Style:** a `#09090B` (near-black) stage is the shared media-focus treatment across the gallery lightbox, generate studio preview, generation editor, clone composition, slideshow editor canvas, automation builder preview, and character builder portrait stage. Media always renders `object-contain`/full-frame on it, centered on the dark floor. This is the one accepted literal hex in the chrome.

### Signature: The Review Queue Row
- Inline approve/reject controls on each row: two 32px ghost icon buttons (check / x). Each is hairline-bordered with a muted icon; on hover it tints toward its semantic color (green for approve, red for reject) with a 10%-tint fill and tinted border/icon. Disabled during a pending mutation (40% opacity). The row is a hairline-divided list with a 56px media thumb, a 13px prompt, and a 12px model · type meta line.

### Signature: The Docked Bulk-Action Bar
- A hairline card docked directly under the filter controls when items are selected. It leads with a coral count chip (the count in coral), a "N selected" label, quiet text actions (Select all / Clear), then the action group (Approve, Reject, Download, Handoff), and the destructive Delete pushed to the far right. Never a floating overlay.

## Do's and Don'ts

### Do:
- **Do** use semantic tokens (`--pf-*`, shadcn tokens) for all new work; the token layer is the only source of truth for colors, radii, shadows, and motion.
- **Do** reserve coral (`--pf-orange`) for primary actions and active navigation — apply **The One Accent Rule** on every surface.
- **Do** render focused media on the `#09090B` dark stage with `object-contain`/full-frame (**The Dark Stage Rule**).
- **Do** use the black/55 corner badge with a status dot for media state, and the `.pf-review-stamp` + `.pf-stamp-slam` for reviewed cards.
- **Do** mark selected grid cards with the coral ring (`border-primary` + `ring-1 ring-primary/25`) and selected rows with the coral tint (`--sidebar-accent` bed + accent-foreground text).
- **Do** dock the contextual bulk-action bar directly under the filter controls — never a floating overlay (**The Docked Bulk Bar Rule**).
- **Do** use the segmented-control grammar (muted bed, surface active pill + tiny shadow) for filters and step navigation.
- **Do** use the real table grammar for list views: hidden-below-md header, hairline dividers, hover bed, 40px thumbs, status pills, row actions.
- **Do** use Geist Mono + tabular-nums for true data only (counts, ids, costs, dates) — **The Data Voice Rule**; keep stat numerals in the sans face (**The Sans Stat Rule**).
- **Do** keep corners at the 8px canon radius and elevation within the `--pf-shadow-2xs..lg` + `--pf-shadow-orange` scale.
- **Do** use the one shared ease (`--pf-ease`) at 180ms for all state transitions.
- **Do** use hairline borders and muted-surface beds for dividers and hovers rather than heavy fills or shadows.

### Don't:
- **Don't** reintroduce the legacy Forge Floor vocabulary — kraft/steel surfaces, ticket tears, rotated stamps, stamped-status squares, dark machine-panel rails. That world is discarded; the canon is the category standard played straight.
- **Don't** place a new literal hex color into a component without also adding it to the dark-mode remap tables in `globals.css` in the same edit. This is the system's known sharp edge: literal hexes still rely on the remap tables; semantic tokens do not. The only accepted literals are the `#09090B` stage and content palettes.
- **Don't** use coral as decoration, chart series, idle icon, or text highlight — it is reserved for intent.
- **Don't** use Geist Mono as costume, for labels, or for anything that is not genuine data — and don't set stat numerals in mono.
- **Don't** use zero-offset colored shadows, bounce easings, or glass-as-decoration.
- **Don't** fabricate a new accent or per-route color palette; one coral accent and zinc neutrals are the system.
- **Don't** add eyebrow/kicker text above page titles; the route header carries title, one-line description, and primary action only.
- **Don't** float the bulk-action bar over content; it docks under the filter controls.
- **Don't** use the forge metaphor in copy — "Forge Cycles" is "Generations"; the brand name PostForge stays.
