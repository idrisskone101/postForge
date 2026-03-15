# Page Component Dependency Trees

## 1. Dashboard (`/`)
**File:** `src/app/page.tsx` (Server Component, async)

```
src/app/page.tsx
├── next/link (Link)
├── next/image (Image)
├── @/lib/db (prisma)
├── @/lib/costs/tracker (getCostSummary)
├── @/components/media-preview (MediaPreview)
│   ├── @/components/ui/skeleton (Skeleton)
│   │   └── @/lib/utils (cn)
│   ├── @/lib/utils (cn)
│   └── lucide-react (ImageOff)
├── @/lib/utils/format-cost (formatCost)
├── @/lib/utils/format-date (formatRelativeDate)
└── lucide-react (Zap, Camera, Film, Sparkles, ArrowRight, Wand2, Play, Download, Trash2, Plus)
```

**Data:** Fetches cost summaries (today/month), active job count, recent 4 completed jobs with outputs.

---

## 2. Launch Forge / Generate (`/generate`)
**File:** `src/app/generate/page.tsx` (Server Component)

```
src/app/generate/page.tsx
├── @/lib/ai/models (getAllModels)
└── @/components/generation-form (GenerationForm) [client]
    ├── @/components/ui/textarea (Textarea)
    │   └── @/lib/utils (cn)
    ├── @/components/ui/button (Button)
    │   └── @/lib/utils (cn)
    ├── @/components/ui/slider (Slider)
    │   └── @/lib/utils (cn)
    ├── @/components/ui/switch (Switch)
    │   └── @/lib/utils (cn)
    ├── @/components/ui/collapsible (Collapsible, CollapsibleContent, CollapsibleTrigger)
    ├── @/components/ui/tooltip (Tooltip, TooltipContent, TooltipTrigger)
    │   └── @/lib/utils (cn)
    ├── @/components/model-picker (ModelPicker) [client]
    │   ├── @/components/ui/tabs (Tabs, TabsList, TabsTrigger, TabsContent)
    │   │   └── @/lib/utils (cn)
    │   ├── @/components/ui/tooltip (Tooltip, TooltipContent, TooltipTrigger)
    │   ├── @/lib/utils (cn)
    │   ├── @/lib/utils/format-cost (formatCost)
    │   ├── @/lib/ai/types (ModelDefinition)
    │   └── lucide-react (ImageIcon, Video, Globe, Volume2, Layers, Zap, Palette, Film, Sparkles)
    ├── @/lib/utils (cn)
    ├── @/lib/utils/format-cost (formatCost)
    ├── @/lib/api/client (apiPost)
    ├── @/lib/ai/models (calculateEstimatedCost)
    ├── @/lib/ai/types (ModelDefinition)
    └── lucide-react (Loader2, Search, Volume2, ChevronDown, Zap, Info, Wand2)
```

---

## 3. Generation Editor (`/generate/[id]`)
**File:** `src/app/generate/[id]/page.tsx` (Client Component)

```
src/app/generate/[id]/page.tsx [client]
├── @/lib/hooks/use-polling (usePolling)
├── @/lib/api/client (apiGet, apiPost)
├── @/components/media-preview (MediaPreview) [client]
│   ├── @/components/ui/skeleton (Skeleton)
│   ├── @/lib/utils (cn)
│   └── lucide-react (ImageOff)
├── @/components/ui/skeleton (Skeleton)
├── @/lib/utils/format-cost (formatCost)
├── @/lib/utils/format-date (formatRelativeDate)
├── @/lib/utils (cn)
├── @/lib/utils/download (downloadFile)
└── lucide-react (ArrowLeft, Download, Play, ZoomIn, Maximize, Crop, Repeat, Plus, Zap, Sparkles, Palette, RefreshCw, Trash2, Loader2, AlertCircle)
```

---

## 4. Gallery (`/gallery`)
**File:** `src/app/gallery/page.tsx` (Server Component, async)

```
src/app/gallery/page.tsx
├── @/lib/db (prisma)
├── @/lib/ai/models (getAllModels)
└── src/app/gallery/gallery-page-client.tsx (GalleryPageClient) [client]
    ├── @/components/gallery-grid (GalleryGrid) [client]
    │   ├── @/components/media-preview (MediaPreview) [client]
    │   │   ├── @/components/ui/skeleton (Skeleton)
    │   │   ├── @/lib/utils (cn)
    │   │   └── lucide-react (ImageOff)
    │   ├── @/components/ui/dialog (Dialog, DialogContent, DialogTitle)
    │   │   ├── @/components/ui/button (Button)
    │   │   ├── @/lib/utils (cn)
    │   │   └── lucide-react (XIcon)
    │   ├── @/lib/utils/format-date (formatRelativeDate)
    │   ├── @/lib/utils/download (downloadFile)
    │   ├── @/lib/utils (cn)
    │   └── lucide-react (Download, Images, Play, Trash2)
    ├── @/components/ui/alert-dialog (AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger)
    │   ├── @/components/ui/button (Button)
    │   └── @/lib/utils (cn)
    ├── @/lib/utils (cn)
    ├── @/lib/utils/download (downloadFile)
    └── lucide-react (Images, Download, Trash2, X, ArrowUpDown)
```

---

## 5. Analytics / Costs (`/costs`)
**File:** `src/app/costs/page.tsx` (Server Component, async)

```
src/app/costs/page.tsx
├── @/lib/db (prisma)
├── @/lib/costs/tracker (getCostSummary)
└── src/app/costs/costs-page-client.tsx (CostsPageClient) [client]
    ├── @/components/cost-chart (CostChart, ModelPieChart) [dynamic import, client]
    │   ├── recharts (AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend)
    │   └── @/lib/utils/format-cost (formatCost)
    ├── @/components/ui/card (Card, CardContent, CardHeader, CardTitle)
    │   └── @/lib/utils (cn)
    ├── @/components/ui/badge (Badge)
    ├── @/components/ui/button (Button)
    ├── @/components/ui/separator (Separator)
    ├── @/components/ui/scroll-area (ScrollArea)
    ├── @/components/ui/toggle-group (ToggleGroup, ToggleGroupItem)
    │   ├── @/components/ui/toggle (toggleVariants)
    │   └── @/lib/utils (cn)
    ├── @/components/ui/table (Table, TableBody, TableCell, TableHead, TableHeader, TableRow)
    │   └── @/lib/utils (cn)
    ├── @/lib/utils/format-cost (formatCost)
    ├── @/lib/utils/format-date (formatRelativeDate)
    └── lucide-react (DollarSign, TrendingUp, Crown, Flame, Download, ArrowUp, ArrowDown)
```

---

## 6. UGC Clone (`/ugc-clone`)
**File:** `src/app/ugc-clone/page.tsx` (Server Component)

```
src/app/ugc-clone/page.tsx
├── @/components/ugc-clone-form (UGCCloneForm) [client]
│   ├── @/components/tiktok-input (TikTokInput) [client]
│   │   ├── @/lib/api/client (apiPost)
│   │   ├── @/lib/utils (cn)
│   │   └── lucide-react (Loader2, Download, Clock, AlertCircle, CheckCircle2)
│   ├── @/components/video-trimmer (VideoTrimmer) [client]
│   │   ├── @/lib/api/client (apiGet, apiPost)
│   │   ├── @/lib/utils (cn)
│   │   └── lucide-react (Loader2, Scissors, Film, GripVertical)
│   ├── @/components/avatar-picker (AvatarPicker) [client]
│   │   ├── @/lib/api/client (apiGet, apiPost, apiDelete)
│   │   ├── @/lib/utils (cn)
│   │   ├── @/components/ui/textarea (Textarea)
│   │   ├── @/lib/ai/models (getModelsByType)
│   │   └── lucide-react (Plus, Trash2, Loader2, User, Sparkles, Upload, ArrowLeft, X, Check, Image, Info)
│   ├── @/components/ui/switch (Switch)
│   ├── @/components/ui/textarea (Textarea)
│   ├── @/components/ui/button (Button)
│   ├── @/lib/utils (cn)
│   ├── @/lib/utils/format-cost (formatCost)
│   ├── @/lib/ai/models (calculateEstimatedCost, getModel)
│   ├── @/lib/api/client (apiGet, apiPost)
│   └── lucide-react (Loader2, Scissors, MessageSquare, Check, RotateCcw, ImageIcon, ArrowLeft, Sparkles, PenLine)
└── @/components/ugc-clone-queue (UGCCloneQueue) [client]
    ├── @/lib/api/client (apiGet)
    ├── @/lib/utils/format-cost (formatCost)
    ├── @/lib/utils/format-date (formatRelativeDate)
    ├── @/lib/utils (cn)
    ├── next/link (Link)
    └── lucide-react (Loader2, CheckCircle2, XCircle, Clock, ExternalLink)
```

---

## 7. UGC Clone Result (`/ugc-clone/[id]`)
**File:** `src/app/ugc-clone/[id]/page.tsx` (Client Component)

```
src/app/ugc-clone/[id]/page.tsx [client]
├── @/lib/hooks/use-polling (usePolling)
├── @/lib/api/client (apiGet, apiPost)
├── @/components/media-preview (MediaPreview) [client]
│   ├── @/components/ui/skeleton (Skeleton)
│   ├── @/lib/utils (cn)
│   └── lucide-react (ImageOff)
├── @/components/ui/skeleton (Skeleton)
├── @/lib/utils/format-cost (formatCost)
├── @/lib/utils/format-date (formatRelativeDate)
├── @/lib/utils/download (downloadFile)
└── lucide-react (ArrowLeft, Download, RefreshCw, Loader2, AlertCircle, Users)
```
