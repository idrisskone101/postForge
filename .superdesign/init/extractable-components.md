# Extractable Components

Components that appear across multiple pages and can be extracted/reused for design consistency.

---

## Layout Components

### 1. Sidebar
**Path:** `src/components/sidebar.tsx`
**Used on:** Every page (via root layout)
**Key Props:** None (self-contained, uses `usePathname()` for active state)
**Exports:** `Sidebar`

### 2. ThemeToggle
**Path:** `src/components/theme-toggle.tsx`
**Used on:** Every page (via Sidebar)
**Key Props:** None (self-contained, uses localStorage)
**Exports:** `ThemeToggle`

---

## Shared Display Components

### 3. MediaPreview
**Path:** `src/components/media-preview.tsx`
**Used on:** Dashboard, Gallery, Generate [id], UGC Clone [id]
**Key Props:**
- `type: "image" | "video"`
- `src: string`
- `width?: number`
- `height?: number`
- `alt?: string`
- `className?: string`
**Exports:** `MediaPreview`
**Features:** Loading skeleton, error state with ImageOff icon, lazy loading, video controls

### 4. GalleryGrid
**Path:** `src/components/gallery-grid.tsx`
**Used on:** Gallery page
**Key Props:**
- `items: GalleryItem[]`
- `selectedIds: Set<string>`
- `onToggleSelect: (id: string) => void`
- `onDelete: (id: string) => void`
**Exports:** `GalleryGrid`
**Features:** Masonry-like grid, lightbox dialog, selection checkboxes, hover overlays with glass effect, staggered fade-in animations

### 5. JobCard
**Path:** `src/components/job-card.tsx`
**Used on:** (Available for job listing contexts)
**Key Props:** `job: { id, type, model, prompt, status, estimatedCost, createdAt, outputs? }`
**Exports:** `JobCard`
**Features:** Status badges with color coding, click to navigate

---

## Form Components

### 6. GenerationForm
**Path:** `src/components/generation-form.tsx`
**Used on:** Generate page
**Key Props:** `models: ModelDefinition[]`
**Exports:** `GenerationForm`
**Features:** Prompt textarea, creative sparks, model picker, aspect ratio selector, sliders, advanced settings collapsible, fixed bottom submit bar, cost preview card

### 7. ModelPicker
**Path:** `src/components/model-picker.tsx`
**Used on:** Generate page (via GenerationForm)
**Key Props:**
- `selectedModel: string | null`
- `onModelSelect: (modelId: string) => void`
- `models: ModelDefinition[]`
**Exports:** `ModelPicker`
**Features:** Tabs for image/video, model cards with capability icons, pricing display

### 8. UGCCloneForm
**Path:** `src/components/ugc-clone-form.tsx`
**Used on:** UGC Clone page
**Key Props:** None (self-contained, uses router)
**Exports:** `UGCCloneForm`
**Features:** Multi-phase wizard (input -> reviewing -> submitted), TikTok download, video trimming, avatar selection, prompt presets, reference image iteration, fixed bottom action bar

### 9. UGCCloneQueue
**Path:** `src/components/ugc-clone-queue.tsx`
**Used on:** UGC Clone page
**Key Props:** None (self-contained, polls API)
**Exports:** `UGCCloneQueue`
**Features:** Auto-polling job list with status icons, video thumbnails for completed jobs

---

## Input Components

### 10. TikTokInput
**Path:** `src/components/tiktok-input.tsx`
**Used on:** UGC Clone page (via UGCCloneForm)
**Key Props:**
- `onDownloaded: (info: TikTokVideoInfo) => void`
- `videoInfo: TikTokVideoInfo | null`
**Exports:** `TikTokInput`, `TikTokVideoInfo` (type)
**Features:** URL input, download button, success/error states

### 11. VideoTrimmer
**Path:** `src/components/video-trimmer.tsx`
**Used on:** UGC Clone page (via UGCCloneForm)
**Key Props:**
- `videoPath: string`
- `durationSec: number`
- `width: number`
- `height: number`
- `onTrimmed: (info) => void`
- `onCancel: () => void`
**Exports:** `VideoTrimmer`
**Features:** Filmstrip thumbnails, pointer-drag handles, looping preview, time display

### 12. AvatarPicker
**Path:** `src/components/avatar-picker.tsx`
**Used on:** UGC Clone page (via UGCCloneForm)
**Key Props:**
- `selectedId: string | null`
- `onSelect: (id: string) => void`
**Exports:** `AvatarPicker`
**Features:** Upload, AI generate, pick from gallery, delete, multi-mode (grid/generate/gallery)

---

## Data Visualization

### 13. CostChart
**Path:** `src/components/cost-chart.tsx`
**Used on:** Analytics/Costs page (dynamically imported)
**Key Props:** `data: Array<{ date: string; image: number; video: number }>`
**Exports:** `CostChart`

### 14. ModelPieChart
**Path:** `src/components/cost-chart.tsx`
**Used on:** Analytics/Costs page (dynamically imported)
**Key Props:** `data: Array<{ name: string; value: number }>`
**Exports:** `ModelPieChart`

---

## Cross-Page Design Patterns

### Ambient Background Blobs
Used on: Dashboard, Generate, UGC Clone pages
Pattern: 2-3 fixed-position divs with `bg-accent-{color}/{opacity}`, `rounded-full`, `mix-blend-multiply`, `blur-[80px]`, `animate-blob`, staggered `animationDelay`

### Floating Status Badge
Used on: Dashboard, Generate, Gallery, UGC Clone
Pattern: `inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm animate-float`

### Launch Card Container
Used on: Generate, UGC Clone
Pattern: `.launch-card bg-card p-8 border border-border` (32px border-radius, bouncy hover lift)

### Fixed Bottom Action Bar
Used on: Generate (GenerationForm), UGC Clone (UGCCloneForm review/input phases)
Pattern: `fixed bottom-0 left-0 md:left-24 right-0 h-24 bg-card/90 backdrop-blur-xl border-t border-border`

### Cost Preview Card
Used on: Generate, UGC Clone
Pattern: Full-width accent-colored card (blue or green) with `rounded-[32px]`, white text, glow shadow, decorative blur circle
