# PostForge — Phase 1 Spec

## Overview

PostForge is a self-hosted AI content generation platform for TikTok marketing. It calls AI model APIs directly via fal.ai instead of paying middleman platforms (GenViral, Shorts Bro), giving full control over models, workflows, and costs.

The platform exposes a REST API that an AI agent (OpenClaw/Clawdy) can call to generate images and videos programmatically, plus a dashboard for manual use and reviewing outputs.

**Cost context**: Direct API calls via fal.ai cost ~$62/month for the same volume that currently costs $130/month across GenViral ($100) + Shorts Bro ($30).

## Tech Stack

- **Runtime**: Node.js 22+
- **Framework**: Next.js 15 (App Router) — API routes for the backend, React frontend for the dashboard
- **Database**: PostgreSQL (via Prisma ORM)
- **AI Provider**: fal.ai (pay-per-call, no subscription, unified API for multiple models)
- **File Storage**: Local filesystem for MVP (`/data/outputs/`), with an abstraction layer to swap to S3/R2 later
- **Styling**: Tailwind CSS v4
- **Package Manager**: pnpm

## Phase 1 Scope

Phase 1 focuses on one core capability: **AI media generation** (images and videos) via fal.ai.

1. **AI Image Generation** — generate images using multiple models (Nano Banana 2, Nano Banana Pro, etc.)
2. **AI Video Generation** — generate videos using multiple models (Kling 3.0, Veo 3, etc.)
3. **Job Queue** — async generation with status tracking (queued → processing → completed → failed)
4. **Output Management** — browse, preview, download, and organize generated media

### Out of Scope (Later Phases)
- Slideshow/carousel generator (text compositing with TikTok fonts)
- TikTok research / viral content search
- TikTok/Instagram posting (Content Posting API)
- Scheduling and queue system for posts
- Analytics and performance tracking
- User authentication (single-user for MVP)

---

## Feature 1: AI Image Generation

### What It Does

Generate images by calling fal.ai model APIs. Supports multiple models with a unified interface. The user (or agent) provides a prompt and model selection, and gets back generated image(s).

### Supported Models

| Model ID | Display Name | fal.ai Endpoint | Price | Notes |
|----------|-------------|-----------------|-------|-------|
| `nano-banana-2` | Nano Banana 2 | `fal-ai/nano-banana-2` | $0.08/image | Default. Fast, good quality. Runs through fal.ai. |
| `nano-banana-pro` | Nano Banana Pro | `fal-ai/nano-banana-pro` | $0.15/image | Higher quality. Runs through fal.ai. Better for complex scenes. |
| `nano-banana` | Nano Banana (Lite) | `fal-ai/nano-banana` | $0.039/image | Budget option. Runs through fal.ai. |

Additional models can be added later by adding entries to the model registry (no code changes needed for basic text-to-image models).

### Image Generation Options

```typescript
interface ImageGenerationRequest {
  prompt: string;
  model: string;                    // model ID from registry, default: "nano-banana-2"
  aspectRatio?: string;             // "9:16" | "16:9" | "1:1" | "4:5" | "3:2" etc. Default: "9:16" (TikTok vertical)
  numImages?: number;               // 1-4, default: 1
  negativePrompt?: string;          // what to avoid
  referenceImageUrls?: string[];    // up to 14 reference images (for style/character consistency)
  enableWebSearch?: boolean;        // ground generation in real-time web info (Nano Banana 2/Pro)
}

interface ImageGenerationResult {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  model: string;
  prompt: string;
  images: GeneratedImage[];
  cost: number;                     // estimated cost in USD
  durationMs?: number;              // how long generation took
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

interface GeneratedImage {
  url: string;                      // fal.ai CDN URL (temporary)
  localPath?: string;               // local saved path (after download)
  width: number;
  height: number;
  contentType: string;
}
```

### fal.ai Integration

Use the official `@fal-ai/client` npm package:

```typescript
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

const result = await fal.subscribe("fal-ai/nano-banana-2", {
  input: {
    prompt: "A 22-year-old woman sitting in a coffee shop...",
    image_size: "portrait_9_16",    // maps from our aspectRatio
    num_images: 1,
    enable_safety_checker: false,
  },
  logs: true,
  onQueueUpdate: (update) => {
    // Update job status in DB
  },
});
```

**Important implementation details:**
- fal.ai calls are async. Use `fal.subscribe()` which handles polling internally.
- For the API, accept the request, create a job record, kick off generation in the background, return the job ID immediately.
- The caller polls `GET /api/generate/images/:jobId` for status.
- Once complete, download the generated images from fal.ai's temporary CDN URLs and save locally. fal.ai CDN URLs expire, so always persist locally.

---

## Feature 2: AI Video Generation

### What It Does

Generate videos by calling fal.ai model APIs. Supports text-to-video and image-to-video. Videos are short-form (5-15 seconds) for TikTok content.

### Supported Models

| Model ID | Display Name | fal.ai Endpoint | Price | Notes |
|----------|-------------|-----------------|-------|-------|
| `kling-3.0` | Kling 3.0 Standard | `fal-ai/kling-video/v3/standard/text-to-video` | $0.029/sec | Default. Best value. 4K native, multi-shot. |
| `kling-3.0-pro` | Kling 3.0 Pro | `fal-ai/kling-video/v3/pro/text-to-video` | ~$0.07/sec | Higher quality motion and cinematic look. |
| `kling-3.0-i2v` | Kling 3.0 Image-to-Video | `fal-ai/kling-video/v3/standard/image-to-video` | $0.029/sec | Animate a static image. Key for reaction videos. |
| `veo3` | Google Veo 3 | `fal-ai/veo3` | $0.20/sec (no audio), $0.40/sec (with audio) | Premium quality. Native audio sync. |
| `veo3-fast` | Google Veo 3 Fast | `fal-ai/veo3/fast` | $0.25/sec | Faster generation, slightly lower quality. |

### Video Generation Options

```typescript
interface VideoGenerationRequest {
  prompt: string;
  model: string;                    // model ID from registry, default: "kling-3.0"
  duration?: number;                // seconds, default: 5, max depends on model (Kling: 15, Veo: 8)
  aspectRatio?: string;             // "9:16" | "16:9" | "1:1", default: "9:16"
  inputImageUrl?: string;           // for image-to-video models
  enableAudio?: boolean;            // for Veo 3 (adds native audio), default: false
  // Kling 3.0 specific
  multiShot?: {                     // Kling 3.0 multi-shot storyboarding
    shots: {
      prompt: string;
      duration: number;             // seconds per shot
      cameraMovement?: string;      // "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "static" etc.
    }[];
  };
}

interface VideoGenerationResult {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  model: string;
  prompt: string;
  video?: GeneratedVideo;
  cost: number;                     // estimated cost in USD
  durationMs?: number;              // generation time
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

interface GeneratedVideo {
  url: string;                      // fal.ai CDN URL (temporary)
  localPath?: string;               // local saved path
  width: number;
  height: number;
  durationSeconds: number;
  contentType: string;
  hasAudio: boolean;
}
```

### fal.ai Video Integration

Video generation is slower than images (1-5 minutes). Use the queue-based approach:

```typescript
// Submit to queue
const { request_id } = await fal.queue.submit("fal-ai/kling-video/v3/standard/text-to-video", {
  input: {
    prompt: "A young woman looks at her phone with a surprised expression...",
    duration: "10",
    aspect_ratio: "9:16",
  },
});

// Poll for status (or use webhooks)
const status = await fal.queue.status("fal-ai/kling-video/v3/standard/text-to-video", {
  requestId: request_id,
  logs: true,
});

// Get result when done
const result = await fal.queue.result("fal-ai/kling-video/v3/standard/text-to-video", {
  requestId: request_id,
});
```

**Important implementation details:**
- Video generation takes 1-5+ minutes. MUST be fully async.
- Store the fal.ai `request_id` in the job record for status polling.
- Run a background polling loop (or use fal.ai webhooks if available) to update job status.
- Once complete, download video from fal.ai CDN and save locally.
- Track estimated cost based on model pricing × duration.

---

## Feature 3: Model Registry

### What It Does

A configuration-driven system for managing supported AI models. Adding a new model should require minimal code changes.

```typescript
interface ModelDefinition {
  id: string;                       // internal ID, e.g., "nano-banana-2"
  name: string;                     // display name
  type: "image" | "video";
  provider: "fal";                  // extensible for future providers
  endpoint: string;                 // fal.ai model endpoint
  pricing: {
    unit: "per_image" | "per_second";
    amount: number;                 // USD
  };
  capabilities: {
    textToImage?: boolean;
    imageToImage?: boolean;
    textToVideo?: boolean;
    imageToVideo?: boolean;
    multiShot?: boolean;
    nativeAudio?: boolean;
    referenceImages?: boolean;
    maxReferenceImages?: number;
    webSearch?: boolean;
  };
  defaults: {
    aspectRatio: string;
    duration?: number;              // for video models
    numImages?: number;             // for image models
  };
  limits: {
    maxDuration?: number;           // max video duration in seconds
    maxImages?: number;             // max images per request
    aspectRatios: string[];         // supported aspect ratios
  };
}
```

Store model definitions in a config file (`src/lib/ai/models.ts`) that can be updated without touching the generation logic.

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model GenerationJob {
  id              String   @id @default(uuid())
  type            String   // "image" | "video"
  model           String   // model ID from registry
  status          String   @default("queued") // queued | processing | completed | failed
  prompt          String
  input           Json     // full request parameters
  output          Json?    // generation result (images/video URLs, dimensions, etc.)
  falRequestId    String?  // fal.ai request ID for async polling
  estimatedCost   Float?   // estimated cost in USD
  actualCost      Float?   // actual cost (if available from fal.ai response)
  durationMs      Int?     // generation duration in milliseconds
  error           String?  // error message if failed
  createdAt       DateTime @default(now())
  startedAt       DateTime?
  completedAt     DateTime?

  outputs         GeneratedFile[]
  tags            String[] // user-defined tags for organization

  @@index([status])
  @@index([type])
  @@index([model])
  @@index([createdAt])
}

model GeneratedFile {
  id            String   @id @default(uuid())
  jobId         String
  job           GenerationJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  type          String   // "image" | "video"
  originalUrl   String   // fal.ai CDN URL (may expire)
  localPath     String   // local file path (permanent)
  filename      String
  mimeType      String
  width         Int?
  height        Int?
  durationSec   Float?   // for video files
  fileSizeBytes Int?
  createdAt     DateTime @default(now())

  @@index([jobId])
  @@index([type])
}

model CostLog {
  id        String   @id @default(uuid())
  jobId     String
  model     String
  type      String   // "image" | "video"
  amount    Float    // USD
  details   Json?    // breakdown (e.g., seconds × rate)
  createdAt DateTime @default(now())

  @@index([createdAt])
  @@index([model])
}
```

---

## API Endpoints

### Image Generation

#### `POST /api/generate/images`
Submit an image generation job.

Request body:
```json
{
  "prompt": "A 22-year-old woman sitting in a coffee shop looking at her phone, warm muted earth tones, VSCO 2023 mood, iPhone 15 Pro front camera style",
  "model": "nano-banana-2",
  "aspectRatio": "9:16",
  "numImages": 1
}
```

Response (202 Accepted):
```json
{
  "id": "job-uuid",
  "status": "queued",
  "model": "nano-banana-2",
  "estimatedCost": 0.08,
  "createdAt": "2026-03-07T16:00:00Z"
}
```

#### `GET /api/generate/images/:id`
Get image generation job status and results.

Response (when completed):
```json
{
  "id": "job-uuid",
  "status": "completed",
  "model": "nano-banana-2",
  "prompt": "...",
  "images": [
    {
      "url": "/api/files/file-uuid",
      "width": 1080,
      "height": 1920,
      "mimeType": "image/png"
    }
  ],
  "estimatedCost": 0.08,
  "durationMs": 12500,
  "createdAt": "...",
  "completedAt": "..."
}
```

### Video Generation

#### `POST /api/generate/videos`
Submit a video generation job.

Request body:
```json
{
  "prompt": "A young woman looks at her phone with a surprised expression, then looks directly at camera and smiles. Close-up shot, natural lighting.",
  "model": "kling-3.0",
  "duration": 10,
  "aspectRatio": "9:16"
}
```

Response (202 Accepted):
```json
{
  "id": "job-uuid",
  "status": "queued",
  "model": "kling-3.0",
  "estimatedCost": 0.29,
  "createdAt": "2026-03-07T16:00:00Z"
}
```

#### `POST /api/generate/videos` (image-to-video)
Submit an image-to-video generation job.

Request body:
```json
{
  "prompt": "The woman slowly turns her head and looks surprised",
  "model": "kling-3.0-i2v",
  "inputImageUrl": "https://example.com/reference.png",
  "duration": 5,
  "aspectRatio": "9:16"
}
```

#### `GET /api/generate/videos/:id`
Get video generation job status and results.

### Job Management

#### `GET /api/jobs`
List all generation jobs. Supports filters:
- `?type=image|video`
- `?status=queued|processing|completed|failed`
- `?model=nano-banana-2`
- `?limit=20&offset=0`
- `?sort=createdAt:desc`

#### `GET /api/jobs/:id`
Get any job by ID (image or video).

#### `DELETE /api/jobs/:id`
Delete a job and its generated files.

#### `POST /api/jobs/:id/retry`
Retry a failed job with the same parameters.

### File Serving

#### `GET /api/files/:id`
Serve a generated file (image or video) by ID. Supports `Accept` header for content negotiation.

#### `GET /api/files/:id/download`
Force-download a generated file.

### Models

#### `GET /api/models`
List all available models with capabilities and pricing.

Response:
```json
{
  "models": [
    {
      "id": "nano-banana-2",
      "name": "Nano Banana 2",
      "type": "image",
      "pricing": { "unit": "per_image", "amount": 0.08 },
      "capabilities": { "textToImage": true, "referenceImages": true, "webSearch": true },
      "defaults": { "aspectRatio": "9:16", "numImages": 1 },
      "limits": { "maxImages": 4, "aspectRatios": ["9:16", "16:9", "1:1", "4:5", "3:2", "4:3"] }
    }
  ]
}
```

### Cost Tracking

#### `GET /api/costs`
Get cost summary. Supports filters:
- `?period=today|week|month|all`
- `?model=nano-banana-2`
- `?type=image|video`

Response:
```json
{
  "period": "month",
  "totalCost": 42.50,
  "breakdown": {
    "image": { "count": 350, "cost": 28.00 },
    "video": { "count": 50, "cost": 14.50 }
  },
  "byModel": {
    "nano-banana-2": { "count": 350, "cost": 28.00 },
    "kling-3.0": { "count": 50, "cost": 14.50 }
  }
}
```

---

## Project Structure

```
postforge/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                          # Seed model registry
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # Dashboard home (recent jobs, cost summary)
│   │   ├── generate/
│   │   │   ├── page.tsx                 # Generation form (pick model, enter prompt)
│   │   │   └── [id]/page.tsx            # Job detail + result preview
│   │   ├── gallery/
│   │   │   └── page.tsx                 # Browse all generated media
│   │   ├── costs/
│   │   │   └── page.tsx                 # Cost tracking dashboard
│   │   └── api/
│   │       ├── generate/
│   │       │   ├── images/
│   │       │   │   ├── route.ts         # POST (create image job)
│   │       │   │   └── [id]/route.ts    # GET (job status + results)
│   │       │   └── videos/
│   │       │       ├── route.ts         # POST (create video job)
│   │       │       └── [id]/route.ts    # GET (job status + results)
│   │       ├── jobs/
│   │       │   ├── route.ts             # GET (list jobs)
│   │       │   └── [id]/
│   │       │       ├── route.ts         # GET + DELETE
│   │       │       └── retry/route.ts   # POST (retry failed job)
│   │       ├── files/
│   │       │   └── [id]/
│   │       │       ├── route.ts         # GET (serve file)
│   │       │       └── download/route.ts # GET (force download)
│   │       ├── models/
│   │       │   └── route.ts             # GET (list models)
│   │       └── costs/
│   │           └── route.ts             # GET (cost summary)
│   ├── lib/
│   │   ├── db.ts                        # Prisma client singleton
│   │   ├── ai/
│   │   │   ├── models.ts               # Model registry (config-driven)
│   │   │   ├── fal-client.ts            # fal.ai API client wrapper
│   │   │   ├── generate-image.ts        # Image generation logic
│   │   │   ├── generate-video.ts        # Video generation logic
│   │   │   └── types.ts                # Shared AI types
│   │   ├── jobs/
│   │   │   ├── queue.ts                 # Job queue management
│   │   │   └── poller.ts               # Background status poller for async jobs
│   │   ├── storage/
│   │   │   └── index.ts                 # File storage abstraction (local now, S3/R2 later)
│   │   └── costs/
│   │       └── tracker.ts              # Cost calculation and logging
│   └── components/
│       ├── generation-form.tsx          # Prompt input + model picker + options
│       ├── job-card.tsx                 # Job status card (queued/processing/done/failed)
│       ├── media-preview.tsx            # Image/video preview component
│       ├── model-picker.tsx             # Model selection with pricing info
│       ├── cost-chart.tsx               # Cost breakdown visualization
│       ├── gallery-grid.tsx             # Grid of generated media
│       └── ui/                          # Shared UI components (buttons, cards, etc.)
├── data/
│   └── outputs/                         # Generated files stored here
│       ├── images/
│       └── videos/
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://postforge:password@localhost:5432/postforge"

# fal.ai
FAL_KEY=""

# API Authentication (single-user MVP)
POSTFORGE_API_KEY=""

# Server
PORT=3000
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Storage
STORAGE_DRIVER="local"
STORAGE_LOCAL_PATH="./data/outputs"
```

---

## Background Job Processing

### Architecture

Since this is a Next.js app (serverless-friendly), background processing needs careful handling:

1. **Job submission**: API route creates a `GenerationJob` record with status "queued", then kicks off generation.
2. **For images** (fast, <30s): Use `fal.subscribe()` which blocks until complete. Run in a detached async context after sending the 202 response. Update DB when done.
3. **For videos** (slow, 1-5min): Use `fal.queue.submit()` to get a `request_id`. Store it. Run a polling loop that checks status every 10 seconds until complete.
4. **File download**: Once generation completes, immediately download from fal.ai CDN to local storage (CDN URLs are temporary).
5. **Cost logging**: After completion, calculate and log cost based on model pricing.

### Polling Implementation

```typescript
// Simplified poller for video jobs
async function pollVideoJob(jobId: string, falEndpoint: string, falRequestId: string) {
  const maxAttempts = 60; // 10 min max (10s intervals)
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(10_000);

    const status = await fal.queue.status(falEndpoint, {
      requestId: falRequestId,
      logs: true,
    });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(falEndpoint, { requestId: falRequestId });
      await handleJobCompleted(jobId, result);
      return;
    }

    if (status.status === "FAILED") {
      await handleJobFailed(jobId, status.error);
      return;
    }

    // Update progress in DB if available
    await updateJobProgress(jobId, status);
  }

  await handleJobFailed(jobId, "Timed out after 10 minutes");
}
```

---

## Frontend Pages (Minimal for Phase 1)

### Dashboard (`/`)
- Cost summary (today, this week, this month)
- Recent jobs (last 10, with status indicators)
- Quick generate button

### Generate (`/generate`)
- Model picker (shows image models and video models in tabs/sections)
- Each model shows: name, price, capabilities
- Prompt textarea
- Options panel (aspect ratio, duration for video, number of images, reference images)
- Submit button → redirects to job detail page

### Job Detail (`/generate/:id`)
- Real-time status updates (polling every 5s)
- Progress indicator for video generation
- When complete: preview generated image(s) or video
- Download button
- Cost display
- Retry button (if failed)
- Prompt and parameters shown for reference

### Gallery (`/gallery`)
- Grid view of all generated images and videos
- Filter by type (image/video), model, date
- Click to view full size / play video
- Bulk download

### Costs (`/costs`)
- Chart showing daily/weekly/monthly spend
- Breakdown by model
- Breakdown by type (image vs video)
- Running total vs budget (configurable)

---

## API Authentication (Phase 1)

Single-user MVP. Use a simple API key in the `Authorization` header for API calls:

```
Authorization: Bearer <POSTFORGE_API_KEY>
```

Set `POSTFORGE_API_KEY` in `.env`. Middleware checks this on all `/api/*` routes. The frontend uses the same key stored in a cookie or local storage.

---

## Success Criteria

Phase 1 is done when:
1. ✅ Can generate images via API using Nano Banana 2 (and switch models)
2. ✅ Can generate videos via API using Kling 3.0 (text-to-video and image-to-video)
3. ✅ Can generate videos via API using Veo 3
4. ✅ Jobs are tracked with status, cost, and output files
5. ✅ Generated files are persisted locally (survive fal.ai CDN expiry)
6. ✅ Dashboard shows job status, previews, and cost tracking
7. ✅ API is documented and callable by an external agent (Clawdy)
8. ✅ Cost tracking shows spend per model, per day, per type

---

## Phase 2 Preview (Not in Scope)

- Slideshow/carousel generator (TikTok-native fonts, text compositing)
- TikTok viral content research (EnsembleData integration)
- TikTok Content Posting API integration
- Instagram Graph API integration
- Post scheduling and queue
- Analytics dashboard (pull metrics from posted content)
- Pack management (image collections)
- Hook library with performance tracking
- Multi-user auth
