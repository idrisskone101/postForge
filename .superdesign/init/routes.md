# Routes

All pages share the root layout at `src/app/layout.tsx` which provides the Sidebar + TooltipProvider wrapper.

## Page Routes

| URL Path | Component File | Type | Nav Label |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Server Component (async) | Dashboard |
| `/generate` | `src/app/generate/page.tsx` | Server Component | Launch Forge |
| `/generate/[id]` | `src/app/generate/[id]/page.tsx` | Client Component | (Generation Editor) |
| `/gallery` | `src/app/gallery/page.tsx` | Server Component (async) | Gallery |
| `/costs` | `src/app/costs/page.tsx` | Server Component (async) | Analytics |
| `/ugc-clone` | `src/app/ugc-clone/page.tsx` | Server Component | UGC Clone |
| `/ugc-clone/[id]` | `src/app/ugc-clone/[id]/page.tsx` | Client Component | (UGC Clone Result) |

## Loading States

| URL Pattern | Loading File |
|---|---|
| `/` | `src/app/loading.tsx` |
| `/generate` | `src/app/generate/loading.tsx` |
| `/generate/[id]` | `src/app/generate/[id]/loading.tsx` |
| `/gallery` | `src/app/gallery/loading.tsx` |
| `/costs` | `src/app/costs/loading.tsx` |
| `/ugc-clone` | `src/app/ugc-clone/loading.tsx` |

## Error & Not Found

| File | Description |
|---|---|
| `src/app/error.tsx` | Global error boundary |
| `src/app/not-found.tsx` | 404 page |

## API Routes

| Method | Path | File |
|---|---|---|
| GET/POST | `/api/avatars` | `src/app/api/avatars/route.ts` |
| GET/DELETE | `/api/avatars/[id]` | `src/app/api/avatars/[id]/route.ts` |
| POST | `/api/avatars/from-generation` | `src/app/api/avatars/from-generation/route.ts` |
| GET | `/api/costs` | `src/app/api/costs/route.ts` |
| GET | `/api/files` | `src/app/api/files/route.ts` |
| GET/DELETE | `/api/files/[id]` | `src/app/api/files/[id]/route.ts` |
| GET | `/api/files/[id]/download` | `src/app/api/files/[id]/download/route.ts` |
| POST | `/api/generate/images` | `src/app/api/generate/images/route.ts` |
| GET | `/api/generate/images/[id]` | `src/app/api/generate/images/[id]/route.ts` |
| POST | `/api/generate/videos` | `src/app/api/generate/videos/route.ts` |
| GET | `/api/generate/videos/[id]` | `src/app/api/generate/videos/[id]/route.ts` |
| GET | `/api/jobs` | `src/app/api/jobs/route.ts` |
| GET | `/api/jobs/[id]` | `src/app/api/jobs/[id]/route.ts` |
| POST | `/api/jobs/[id]/retry` | `src/app/api/jobs/[id]/retry/route.ts` |
| GET | `/api/models` | `src/app/api/models/route.ts` |
| POST | `/api/ugc-clone/download` | `src/app/api/ugc-clone/download/route.ts` |
| POST | `/api/ugc-clone/generate` | `src/app/api/ugc-clone/generate/route.ts` |
| GET | `/api/ugc-clone/preview` | `src/app/api/ugc-clone/preview/route.ts` |
| POST | `/api/ugc-clone/reference-image` | `src/app/api/ugc-clone/reference-image/route.ts` |
| GET | `/api/ugc-clone/thumbnails` | `src/app/api/ugc-clone/thumbnails/route.ts` |
| POST | `/api/ugc-clone/trim` | `src/app/api/ugc-clone/trim/route.ts` |

## Server vs Client Component Pattern

Pages follow a consistent pattern:
- **Server page** fetches data from Prisma, transforms it to serializable props
- **Client component** receives serialized props and handles interactivity
- Examples: `gallery/page.tsx` (server) -> `gallery-page-client.tsx` (client), `costs/page.tsx` (server) -> `costs-page-client.tsx` (client)
- Dynamic pages (`[id]`) are fully client-side with polling via `usePolling` hook
