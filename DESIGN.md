---
name: PostForge
description: Workbench charcoal and ember. A dark working surface where the only colour is what is live.
colors:
  floor: "#EDEDEB"
  floor-dark: "#141516"
  panel: "#FFFFFF"
  panel-dark: "#1D1E20"
  raised: "#F5F5F3"
  raised-dark: "#27282B"
  raised-strong: "#E9E9E6"
  raised-strong-dark: "#34363A"
  strong: "#1A1A1A"
  strong-dark: "#3A3C40"
  hairline: "#DCDCD8"
  hairline-dark: "#2E3033"
  outline: "#C9C9C4"
  outline-dark: "#45474C"
  text: "#1A1A1A"
  text-dark: "#F2F0EB"
  text-secondary: "#4D4D4D"
  text-secondary-dark: "#B9B7B1"
  text-muted: "#666666"
  text-muted-dark: "#8F8D88"
  nav-icon-dark: "#9A9893"
  action: "#1A1A1A"
  action-dark: "#F2F0EB"
  action-foreground: "#FFFFFF"
  action-foreground-dark: "#141516"
  action-hover-dark: "#FFFFFF"
  action-pressed-dark: "#D9D6CF"
  ember: "#FF4A20"
  ember-dark: "#FF5B2E"
  ember-text: "#C2330F"
  ember-text-dark: "#FF8254"
  ember-wash: "#FFEDE7"
  ember-wash-dark: "#3A2118"
  ok: "#15803D"
  ok-dark: "#6FD99A"
  ok-tint: "#E6F4EA"
  ok-tint-dark: "#18301F"
  warn: "#A16207"
  warn-dark: "#EBC25B"
  warn-tint: "#FBF1D9"
  warn-tint-dark: "#352B10"
  bad: "#B91C1C"
  bad-dark: "#FF7A85"
  bad-tint: "#FBE9E9"
  bad-tint-dark: "#3B1B1F"
  chart-primary-dark: "#D9D6CF"
  chart-secondary-dark: "#6B6D72"
typography:
  display:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.02em"
  stat:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "20px"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "21px"
  meta:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "16px"
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
  data:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    lineHeight: "16px"
    fontVariantNumeric: "tabular-nums"
rounded:
  tile: "12px"
  panel: "16px"
  pill: "999px"
spacing:
  hairline: "1px"
  xs: "2px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action-dark}"
    textColor: "{colors.action-foreground-dark}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover-dark}"
    textColor: "{colors.action-foreground-dark}"
  button-primary-active:
    backgroundColor: "{colors.action-pressed-dark}"
    textColor: "{colors.action-foreground-dark}"
  button-strong:
    backgroundColor: "{colors.strong-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  button-quiet:
    backgroundColor: "{colors.raised-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  panel:
    backgroundColor: "{colors.panel-dark}"
    rounded: "{rounded.panel}"
    padding: "18px 20px 20px"
  input:
    backgroundColor: "{colors.raised-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.tile}"
    padding: "0 14px"
    height: "42px"
  nav-item-active:
    backgroundColor: "{colors.raised-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.pill}"
    height: "36px"
  status-badge:
    backgroundColor: "{colors.ok-tint-dark}"
    textColor: "{colors.ok-dark}"
    rounded: "{rounded.pill}"
    height: "22px"
---

# Design System: PostForge

## What this site is

PostForge is a self-hosted, single-operator marketing dashboard: generate, UGC clone, slideshow, gallery, automations, performance, spend, and settings. It is not a marketing landing page. The product is an authenticated workspace: a 248px sidebar (72px rail) sitting on the floor, a title-only page header, charcoal panels, and one ember accent. `PRODUCT.md` stays product context; this file stays visual canon.

## Visual source

The designs are the source of truth. They live in Paper, file `01M74DGFD1W8647F6RFTFTT93Q`, page "3 Workbench" (`p-3-0`): `00 Shell`, one artboard per route, and `19 Interaction notes` for motion and states. Read them with the Paper MCP (`get_jsx`, `get_computed_styles`) and take sizes and colours from there, never from a screenshot. A surface with no artboard is designed from the same primitives; anything larger than a confirm dialog is drawn first on the page "4 Workbench additions" (`p-4-0`).

## Taste Skill / how agents design

This file owns PostForge tokens, named rules, and primitives. It wins over any inferred palette or new theme. Kode mode owns structure (colocate, types files, kode-taste); it does not own look. [Taste Skill](https://www.tasteskill.dev/) owns the anti-slop UX (layout, hierarchy, spacing, motion, pre-flight) that this file does not specify.

For a kode route pass: read this file, `PRODUCT.md`, and the shared shell, then load [`redesign-existing-projects`](https://github.com/Leonxlnx/taste-skill/blob/main/skills/redesign-skill/SKILL.md) (audit existing UI first) and [`design-taste-frontend`](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md) (v2 default: brief inference, design-system map, redesign-audit, pre-flight). [`minimalist-ui`](https://github.com/Leonxlnx/taste-skill/blob/main/skills/minimalist-skill/SKILL.md) matches the subtraction rules below. Never [`industrial-brutalist-ui`](https://github.com/Leonxlnx/taste-skill/blob/main/skills/brutalist-skill/SKILL.md). Load [`gpt-taste`](https://github.com/Leonxlnx/taste-skill/blob/main/skills/gpt-tasteskill/SKILL.md) only if the runner is GPT / Codex. Imagegen skills are image-only; not for a kode route pass.

Redesign protocol: audit first, preserve the canon, do not modernize into a different product. Skills live under `skills/` in [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill).

## Overview

**Creative North Star: "Workbench, charcoal and ember"**

A forge burns charcoal. The page is charcoal in four steps, the text is bone, and the only colour is the ember. Ember means live, current or selected. It never means "click me". Bone marks the one primary action on a screen.

Dark is the default theme. Light stays available behind the theme toggle with the same roles. The `.dark` class on `<html>` carries the dark values; the inline theme script adds it unless `localStorage["postforge-theme"]` is `"light"`.

**Key characteristics**
- Surfaces are stepped charcoal with no borders: floor, panel, raised, stronger raised. A panel is a 16px rounded block with a one-pixel inner edge, not a card with a stroke.
- One accent. Ember is reserved for what is live, current or selected: the active nav icon, a running bar, a selection ring, a chosen chip, an on toggle, a focus ring.
- One primary. The bone pill appears at most once per screen. Everything else is a strong, quiet or outline pill.
- Controls are full pills. Tiles, thumbnails and inputs are 12px. Panels are 16px.
- Hanken Grotesk carries all UI type. Geist Mono is only for ids, costs, timestamps and durations.
- Motion confirms an action or a state change and never bounces.

## Tokens

All colour, radius, shadow and motion values live in `src/app/styles/tokens.css`. `:root` holds the light values and `.dark` the dark ones. Component code uses the tokens or the Tailwind roles mapped from them; no literal hex appears in `src/**/*.ts(x)`.

| Role | Token | Tailwind | Dark | Light |
|---|---|---|---|---|
| Floor | `--pf-floor` | `bg-floor` | `#141516` | `#EDEDEB` |
| Panel | `--pf-panel` | `bg-panel` | `#1D1E20` | `#FFFFFF` |
| Raised, inset bed | `--pf-raised` | `bg-raised` | `#27282B` | `#F5F5F3` |
| Stronger raised | `--pf-raised-strong` | `bg-raised-strong` | `#34363A` | `#E9E9E6` |
| Strong secondary | `--pf-strong` / `--pf-strong-fg` | `bg-strong text-strong-fg` | `#3A3C40` / bone | `#1A1A1A` / white |
| Hairline | `--pf-hairline` | `border-hairline` | `#2E3033` | `#DCDCD8` |
| Outline on raised | `--pf-outline` | `border-edge` | `#45474C` | `#C9C9C4` |
| Media placeholder | `--pf-media` | `bg-media` | `#2A2B2E` | `#E4E4E1` |
| Text | `--pf-text` | `text-fg` | `#F2F0EB` | `#1A1A1A` |
| Text secondary | `--pf-text-secondary` | `text-fg-secondary` | `#B9B7B1` | `#4D4D4D` |
| Text muted | `--pf-text-muted` | `text-fg-muted` | `#8F8D88` | `#666666` |
| Disabled text | `--pf-disabled-fg` | `text-fg-disabled` | `#6F6E6A` | `#A3A3A0` |
| Primary action | `--pf-action` / `--pf-action-fg` | `bg-action text-action-fg` | `#F2F0EB` / `#141516` | `#1A1A1A` / white |
| Primary hover, pressed | `--pf-action-hover`, `--pf-action-pressed` | | `#FFFFFF`, `#D9D6CF` | `#000000`, `#333333` |
| Ember | `--pf-ember` | `bg-ember` | `#FF5B2E` | `#FF4A20` |
| Ember text | `--pf-ember-text` | `text-ember-text` | `#FF8254` | `#C2330F` |
| Ember wash | `--pf-ember-wash` | `bg-ember-wash` | `#3A2118` | `#FFEDE7` |
| OK | `--pf-ok` / `--pf-ok-tint` | `text-ok bg-ok-tint` | `#6FD99A` on `#18301F` | `#15803D` on `#E6F4EA` |
| Warn | `--pf-warn` / `--pf-warn-tint` | `text-warn bg-warn-tint` | `#EBC25B` on `#352B10` | `#A16207` on `#FBF1D9` |
| Bad | `--pf-bad` / `--pf-bad-tint` | `text-bad bg-bad-tint` | `#FF7A85` on `#3B1B1F` | `#B91C1C` on `#FBE9E9` |
| Chart series | `--pf-chart-1`, `--pf-chart-2`, `--pf-chart-grid` | `chart-1`, `chart-2` | `#D9D6CF`, `#6B6D72`, `#2E3033` | `#1A1A1A`, `#B4B4B0`, `#DCDCD8` |
| Panel edge | `--pf-panel-shadow` | `shadow-panel` | `inset 0 0 0 1px rgb(255 255 255 / 0.04)` | `0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.10)` |
| Float | `--pf-float-shadow` | `shadow-float` | `0 0 0 1px #3A3C40, 0 10px 28px -10px rgb(0 0 0 / 0.5)` | hairline ring and a soft drop |

The shadcn tokens (`--background`, `--card`, `--primary`, `--border`, `--ring`, the sidebar and chart sets) and the older `--pf-*` names (`--pf-canvas`, `--pf-surface`, `--pf-ink`, `--pf-orange` and the rest) are aliases of these roles, so existing code follows the theme. New code uses the role names.

### Named Rules
**The Ember Rule.** Ember marks what is live, current or selected. It is never a call to action, never a decoration, never a chart series. In a chart it marks the one current datum.

**The One Primary Rule.** The bone pill appears at most once per screen. A second important action is a strong pill; the rest are quiet.

**The Status Only Rule.** Green, amber and red appear only as status: a 22px round badge, a worded chip for a real state, a count badge, a split bar. They never colour a surface or a heading.

**The No-Literal-Hex Rule.** No literal hex in component code. The accepted literals are the `#09090B` media stage, the slide-theme palettes in the slideshow, and the `TEMPLATE_VISUALS` maps (content, not chrome). The gate counts the rest.

## Typography

**UI font:** Hanken Grotesk, variable, weights 400 to 700, self-hosted as woff2 in `public/fonts` (SIL Open Font License) with `font-display: swap`.
**Data font:** Geist Mono, self-hosted the same way.

### Hierarchy
- **Page title** (700, 28px / 32px, -0.02em): one per page, in `PageHeader`. The same size on every route.
- **Stat numeral** (700, 34px / 40px, -0.02em, tabular): the figure in a stat strip.
- **Panel title** (700, 16px / 20px, -0.01em): `.wb-panel-title`.
- **Body** (400 to 500, 14px / 21px): row titles are 14px / 600.
- **Meta** (400, 13px / 16px): secondary lines, table cells.
- **Label** (600, 12px / 16px, muted): field labels, stat labels, table headers. Sentence case, never uppercase, never tracked.
- **Data** (Geist Mono, 12px / 16px, tabular): ids, costs, timestamps, durations.

### Named Rules
**The Data Voice Rule.** Geist Mono is only for ids, costs, timestamps and durations. Stat numerals and counts in badges stay in the sans face.

**The Sentence Case Rule.** Sentence case everywhere. No uppercase tracked labels, no eyebrow above a title, no em dashes in copy, no emoji.

## Layout

The shell matches `00 Shell` at 1440: floor background, 16px page padding, a 248px sidebar sitting on the floor (it is not a panel), a 12px gap, then the content column. Panels are separated by 12px and padded 20 to 24px inside.

- **1280 and up:** the 248px sidebar. The header button collapses it to the 72px rail; the choice persists in `localStorage["postforge-sidebar-collapsed"]` and is applied through `html[data-sidebar-collapsed]` before first paint.
- **768 to 1279:** the 72px icon rail.
- **Below 768:** a 56px top bar and a slide-in drawer.

The page header is a 56px row: the 28px title, and an actions slot holding at most the one bone primary plus one quiet secondary. Detail pages add a 40px round back button before the title.

From 1280 down, panels reflow and never clip. Check 1440, 1280, 1024, 768 and 390.

### Subtraction rules
- The page header is the title only. No description line.
- No sidebar group labels. Groups are separated by a 20px gap. The sidebar footer is one row: Settings with the theme toggle at its end.
- No filler copy: no panel sub-captions, no helper sentence that restates the control, no label that repeats its heading.
- Status words on thumbnails and in dense tables are 22px round icon badges. Counts are badges or `x / y`. Budgets and splits are thin bars.
- Destructive actions stay labelled. Real state stays visible: disconnected, failed, approval required, and unavailable metrics as a dash, never zero.

## Elevation & Depth

Depth comes from the charcoal steps, not from shadows. A panel carries only its one-pixel inner edge. The single drop shadow in the system belongs to floating surfaces: the bulk dock, toasts, menus, dialogs, the mobile drawer.

- **Selection ring on media:** `box-shadow: 0 0 0 2px <panel>, 0 0 0 4px <ember>`.
- **Focus on inputs:** a 2px ember ring that grows from 0. Error swaps it to red in place.
- **Focus on buttons and links:** a 2px ember outline with a 2px offset.

## Shapes

16px panels. 12px tiles, thumbnails, inputs, option rows, wells and notices. Buttons, chips, nav items, segmented controls, badges and toasts are full pills. The brand tile is 32px with a 9px radius. Hairlines are 1px and appear only between rows inside a panel.

## Motion

From `19 Interaction notes`. Tokens: `--pf-dur-feedback` 160ms, `--pf-dur-state` 200ms, `--pf-dur-enter` 220ms, `--pf-dur-exit` 160ms, `--pf-ease` `cubic-bezier(0.22, 1, 0.36, 1)`.

- **Feedback, 160ms:** hover, press, focus ring, selection ring.
- **State change, 200ms:** nav pill, segmented control, toggle, content swap.
- **Enter, 220ms:** toast, bulk dock, inspector panel. Exits use 160ms.
- **Buttons:** the fill shifts in 160ms; press scales to 0.98 and steps the fill down one shade. Disabled does not animate.
- **Navigation:** hover fades in a 60% raised bed; the active raised pill slides to the new item in 200ms and its icon turns ember.
- **Media tile:** hover fades the action row in and lifts it 4px. The image never zooms. Select draws the ember ring and scales the check from 0.8 to 1.
- **Loading:** skeletons are static. Content cross-fades in over 200ms. The only loop is an ember highlight sweeping a running bar every 1.6s.
- **Toast:** rises 12px and fades in at the bottom centre of the content area, leaves after 5s. Failures stay until dismissed.

Only `transform` and `opacity` animate, plus `box-shadow` for rings and `background-color` for fills. `prefers-reduced-motion` is honoured globally.

## Components

The primitives live in `src/components/workbench` (one component per file) with their classes in `src/app/styles/workbench.css` and `workbench-data.css`. The shell classes are in `shell.css`.

### Buttons
- **Primary (`Button variant="primary"`, `.wb-btn-primary`):** bone pill, ink text, 40px, 14px / 600. Hover `#FFFFFF`, pressed `#D9D6CF`.
- **Strong:** `#3A3C40` pill, the second most important action and the action in an empty state.
- **Quiet:** raised pill, 32 to 40px, 13px / 600. The default.
- **Outline:** transparent with a 1px inset ring, for buttons sitting on a raised surface such as the bulk dock.
- **Danger:** red tint with red text. Always labelled.
- **Icon buttons (`IconButton`):** round, 28 to 40px: quiet, strong, outline or ghost.
- **Disabled:** raised fill with `#6F6E6A` text. No opacity fade on text buttons.

### Inputs
42px on the raised colour, no border, 12px radius, 14px text, muted placeholder (`.wb-input`, `ui/input`). Search fields are the 36px variant with a leading 15px icon. A `Field` is a 12px / 600 muted label 6px above the control.

### Panels
`Panel`: 16px radius, panel colour, the inner edge, 18px 20px 20px padding. The title row is 32px tall with a 16px / 700 title and at most one trailing control, usually a quiet 32px pill. No caption under the title.

### Segmented control
A raised pill bed, 36px tall with 3px padding. Segments are 30px, 13px / 500 secondary text. The active segment is `#3A3C40` with 600 bone text (light: white with a soft shadow). Used for filters, view toggles and period pickers.

### Chips and option rows
`Chip`: 36px raised pill. Chosen: ember wash, a 2px inset ember ring, ember text, and a leading check where the design shows one. Option rows are 60px, 12px radius, and gain only the ember ring.

### Status
- **`StatusBadge`:** 22px round icon badge: green check, amber clock, red x, neutral clock. Used on thumbnails and in dense tables in place of status words.
- **`StatusChip`:** 24px worded chip for real states such as "Connected", "Reconnect required", "Not connected".
- **`CountBadge`:** 20px pill. Neutral by default, red tint for failures, amber for attention.
- **Live dot:** 8px ember dot with a 4px ember-wash halo.

### Stat strip
`StatStrip`: stats in one panel split by hairlines. Each is a 12px / 600 muted label over a 34px / 700 numeral, with an optional inline bar or chip.

### Meters
`Meter`: a 4px bar. Neutral fill for budgets, ember for running work (with the sweep). `SplitMeter`: weighted parts with 2px gaps for a split such as completed against failed, or equal segments for a step count.

### Step rail
`StepRail`: a 30px numbered circle and a name per step, joined by 2px connectors. The current step has a 2px ember ring and an ember numeral. Done steps are a filled `#3A3C40` circle with a check.

### Media tile
`MediaTile`: 12px radius on the media placeholder colour. Status badge top right, duration chip bottom right in Geist Mono on a dark scrim, selection check top left. Selected tiles carry the ember selection ring. The hover action row holds a bone "Preview" and a translucent second action.

### Rows
- **Key-value rows (`KeyValueList`):** 30px inspector rows split by hairlines, muted label left, value right.
- **Tables:** a filled 36px header bar on the raised colour with 12px / 600 labels, then 60px rows split by hairlines.

### Empty, loading, feedback
- **`EmptyState`:** a dashed 12px tile with a 44px round icon, one 14px / 600 line and one strong action. It fades in once.
- **`Skeleton`:** static raised shapes. No shimmer, no pulse.
- **`Toast`:** a 48px raised pill with a 20px status badge, the message and one inline action.

### Navigation
36px pill items: 10px inline padding, 10px gap, an 18px icon at 1.5 stroke, 14px / 500 secondary text. Active: the raised pill, 600 bone text, an ember icon. Jobs carries a red-tint count of failed jobs; Gallery carries a neutral count of outputs waiting for review.

### Icons
`Icon`: 24 viewBox, 1.5 stroke, round caps and joins, `currentColor`. Paths come from the Paper file.

## Do's and Don'ts

### Do
- **Do** use the role tokens and the `src/components/workbench` primitives for all new work.
- **Do** keep ember for live, current and selected, and bone for the one primary.
- **Do** keep real state visible: disconnected, failed, approval required, and a dash for an unavailable metric.
- **Do** use round icon badges for status in dense places and worded chips where the state must be read.
- **Do** check both themes and the five widths before calling a surface done.

### Don't
- **Don't** add a border to a panel, a description under a page title, a label above a sidebar group, or a caption under a panel title.
- **Don't** use ember on a button, a link, a chart series or a heading.
- **Don't** put two bone pills on one screen.
- **Don't** add shimmer, pulse, bounce or image zoom.
- **Don't** write a literal hex in component code, or pin a route's size from a stylesheet with `!important`.
- **Don't** draw visible copy with CSS `content: attr(...)`. Text is real text rendered by React.
- **Don't** use the forge metaphor in copy. The brand name PostForge stays.
