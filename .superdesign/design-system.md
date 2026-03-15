# PostForge Design System

## Product Context
PostForge is a self-hosted AI content generation platform for TikTok marketing. Users create images and videos using AI models (fal.ai). The primary persona is a daily content creator who needs to quickly generate, review, and export assets.

## Key Pages & Architecture
- **Dashboard** (`/`): Landing page with greeting, metrics, recent generations
- **Launch Forge** (`/generate`): AI generation form with prompt, model picker, parameters
- **Generation Editor** (`/generate/[id]`): Result viewer with enhance controls
- **Gallery** (`/gallery`): Asset library with grid, lightbox, bulk actions
- **Analytics** (`/costs`): Spending charts, model usage, cost logs
- **UGC Clone** (`/ugc-clone`): TikTok URL input, avatar selection, clone generation

## Visual Identity

### Colors
- **Background (dark):** `oklch(0.145 0 0)` (near-black)
- **Card (dark):** `oklch(0.205 0 0)` (~6% luminosity lift)
- **Foreground (dark):** `oklch(0.985 0 0)` (near-white)
- **Muted foreground (dark):** `oklch(0.708 0 0)`
- **Border (dark):** `oklch(1 0 0 / 10%)`

### Accent Colors (same in both themes)
| Name | Hex | Usage |
|------|-----|-------|
| Tech Blue | `#4F9FD9` | Analytics, active states, info, video badges |
| Sage Green | `#7BA543` | Images, success, UGC clone |
| Coral | `#FF7A59` | Primary CTA buttons, logo accent, destructive-adjacent |

### Typography
- **Font family:** Poppins (weights 400, 500, 600, 700, 800)
- **Headings:** `font-extrabold` (800 weight)
- **Labels:** `uppercase tracking-widest`
- **Body:** `text-muted-foreground text-lg`
- Both `--font-sans` and `--font-mono` map to Poppins

### Border Radius
- Base: `0.625rem` (10px)
- Cards: `32px` (rounded-[32px])
- Model cards: `rounded-3xl` (24px)
- Smaller chips: `rounded-2xl` (16px)
- Buttons: `rounded-full`
- Sidebar: `40px` pill shape
- Nav items: `20px`

### Spacing Rhythm
- After headers: `mb-12`
- Metric grid gap: `gap-8`
- Media grid gap: `gap-6`
- Card padding: `p-8`

### Glass Morphism
- `.glass` class: `backdrop-blur(12px)` + semi-transparent bg
- `.glass-overlay` class: `backdrop-blur(8px)` for hover cards
- Dark: `rgba(255, 255, 255, 0.05)` bg / `rgba(255, 255, 255, 0.08)` border
- Light: `rgba(255, 255, 255, 0.85)` bg / `rgba(0, 0, 0, 0.08)` border

### Animations
| Animation | Duration | Usage |
|-----------|----------|-------|
| `blob` | 7s infinite | Ambient background spheres (translate + scale) |
| `float` | 4s ease-in-out infinite | Floating badges, mascot avatar |
| `fade-in-up` | 0.5s ease-out | Page entrance (opacity + translateY) |
| Spring easing | `cubic-bezier(0.34, 1.56, 0.64, 1)` | All hover lifts, card interactions |

### Hover Behaviors
- Media cards: `-translate-y-2` + `shadow-lg`
- Metric cards: `-translate-y-1` + `shadow-lg`
- Gallery cards: `-translate-y-8` + `scale(1.02)` via `.gallery-card`
- Icon containers: `scale-110 rotate-6` on group-hover
- Logo: `scale-110`
- Glass overlay: `opacity-0 -> opacity-100` transition

### Component Patterns
- **Cards:** `bg-card border border-border rounded-[32px] p-8`
- **Status badges:** `inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm`
- **CTA buttons:** `bg-accent-coral text-white rounded-full px-8 py-3`
- **Fixed bottom bar:** `fixed bottom-0 left-0 md:left-24 right-0 h-24 bg-card/90 backdrop-blur-xl border-t`
- **Cost preview card:** Full-width `bg-accent-blue rounded-[32px]` with white text and glow shadow

### Layout Structure
- **Sidebar:** Fixed left, 80px wide pill-shaped card (desktop). Sheet drawer on mobile.
- **Content area:** `ml-0 md:ml-24` offset from sidebar
- **Ambient blobs:** 2-3 fixed-position divs with accent colors, `blur-[80px]`, `mix-blend-screen` (dark) / `mix-blend-multiply` (light)

## Design Constraints
- Default theme is DARK
- All designs must use ONLY Poppins font
- All designs must use ONLY the three accent colors (blue, green, coral) plus the neutral OKLCH scale
- No serif fonts, no decorative fonts, no gradients outside the existing accent colors
- Maintain the glassmorphic, rounded, soft aesthetic throughout
- Sidebar width is fixed at 80px (desktop) — do not modify
