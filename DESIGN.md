# PostForge Design Language

Source of truth for any design work, including MagicPath canvas designs. Any new screen, rework, or MagicPath design must read as part of this system. Extracted from the live app (localhost:3100) and `src/app/globals.css`.

## Theme and tokens

The app is token-driven (Tailwind v4, CSS-first) with light + dark themes. Always use semantic tokens, never hardcoded colors, so both themes keep working.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | `#f3f4ef` (sage off-white) | `#141613` | Page canvas |
| `card` | white | elevated dark | Card surfaces |
| `border` | `#DADBD2` family | `white/10` alpha | Card borders |
| `foreground` | `#30312E` | near-white | Primary text |
| `muted-foreground` | `#777873` / `#969792` | `white/45` | Secondary text |
| `accent-coral` | `#FF4A20` (hover `#E9421C`) | `#FF7A59` | Primary CTAs, brand mark. The ONE brand accent |
| `accent-green` | `#22C55E` (text `#238A40`, wash `#E9F7EC`) | `#7BA543` | Success, ready, live badges |
| `accent-blue` | `#378EFF` | `#4F9FD9` | Info links, active/processing status |
| `destructive` | `#C53A32` family | oklch destructive | Failed states |

## Typography

- Font: **Geist** (sans + mono), Inter fallback.
- Scale is compact and dense: page title `text-2xl font-semibold tracking-tight`, card titles `text-[13px] font-semibold`, body/helper `text-[11px]` and `text-[12px] leading-5`, micro-labels `text-[10px] font-semibold` with selective `uppercase tracking-[0.09em]`.
- Numbers and prices: `font-mono text-[10px] tabular-nums`.

## Shape and layout

- Cards: `rounded-[13px] border bg-white shadow-[var(--pf-shadow-xs)]` with `p-4`. Inner elements `rounded-[9px]` / `rounded-[11px]`, small buttons `rounded-lg`/`rounded-md`, chips `rounded-full`.
- Step chips: `size-6 grid place-items-center rounded-[7px] bg-[#F0F1EB] text-[10px] font-bold text-[#777873]` containing 01 / 02 / 03.
- Studio layout: `grid xl:grid-cols-[minmax(360px,0.72fr)_minmax(500px,1.28fr)] gap-4`, sticky preview column (`xl:sticky xl:top-4`).
- Page container: `max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8`.

## Components

- Primary CTA: `h-11 rounded-[10px] bg-[#FF4A20] px-5 text-[11px] font-bold text-white shadow-[0_2px_0_rgba(130,25,0,0.14)] hover:bg-[#E9421C]`, `active:scale-[0.97]`.
- Secondary: `rounded-[9px] border border-[#DADBD2] bg-white text-[11px] font-semibold text-[#666762]`, hover `border-[#BFC0B9] text-[#30312E]`.
- Option buttons (ratios, counts): `h-8 rounded-lg border`, selected = `border-[#232323] bg-[#F3F4EF] text-[#232323]`.
- Selection cards (models, identities): border card, selected = accent border + tinted wash + soft ring.
- Status pills: `rounded-full px-2 py-1 text-[11px] font-bold`; green wash = ready/live, neutral wash = optional/secondary, red wash = error, blue wash = info notice.
- Inputs: `rounded-[9px] border-[#D7D8D0] bg-[#FCFCFA]`, focus `border-[#FF4A20] ring-[#FF4A20]/10`.
- Switches: green when on (`#22C55E`), gray track when off.
- Segmented tabs: `rounded-[9px] bg-[#F0F1EB] p-1`, active tab `bg-white shadow-sm`.
- Preview stage: light grid background (`bg-[#EFEFE9]` + 24px grid lines), framed output card (`border-[6px] border-white rounded-[13px] shadow-xl`), glass summary chip.
- Bottom action bar: summary line + `Cost Estimate · $X` + coral Generate button; on mobile a fixed floating card.
- Empty/error/loading: `WorkspaceState` + skeletons. Never hand-roll.

## Motion

- Panel/step enter: fade + 8px rise, ~350ms `cubic-bezier(0.16,1,0.3,1)` (`animate-content-enter`).
- Completion: one-shot success pulse (green ring), checkmark reveal.
- Press feedback: `active:scale-[0.97]` on all buttons.
- Skeleton shimmer for loading. Spinners only for active generation.
- Everything neutralized under `prefers-reduced-motion`. Transform/opacity only. Motion communicates feedback or state change, never decoration.

## Copy rules

- No em-dashes (`—`) or en-dashes (`–`). Use periods, commas, colons, or hyphens.
- Sentence case headings, plain functional sentences, no filler verbs.
- Guidance over silence: show what is missing ("Add a model and a prompt to continue") instead of only disabling the action.

## Status semantics (consistent everywhere)

| State | Color | Treatment |
| --- | --- | --- |
| Queued / processing | accent-blue | pill + spinner or pulsing dot |
| Ready / completed / live | accent-green | pill or badge |
| Failed | destructive | banner + inline retry |
| Optional section | neutral gray | "Optional" chip |

## MagicPath rule

MagicPath canvas designs for this app must use this language: the sage/white light theme (or `#141613` dark), Geist-style compact type, 13px cards, step chips, coral/green/blue accent semantics, and the motion set above. Do not design in a different visual family (dark-neon themes, marketing serif themes, different accent hues) and port it over.
