import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { JobsActivity } from "../../src/app/(app)/jobs/jobs-activity";
import {
  getJobActivityLabel,
  getJobDestination,
  getJobStatusLabel,
} from "../../src/lib/jobs/presentation";

const now = new Date("2026-08-10T14:30:00.000Z");
const baseJob = {
  type: "image",
  model: "nano-banana-2",
  status: "completed",
  queueStage: "completed",
  prompt: "Create a clean production reference",
  input: {},
  tags: [] as string[],
  estimatedCost: 0.08,
  actualCost: 0.08,
  durationMs: 42_000,
  error: null,
  createdAt: now,
  startedAt: now,
  completedAt: now,
};

const jobs = [
  {
    ...baseJob,
    id: "reference-image-job",
    status: "processing",
    queueStage: "submitted",
    tags: ["ugc-clone-ref"],
    startedAt: new Date(now.getTime() - 192_000),
    completedAt: null,
    durationMs: null,
  },
  {
    ...baseJob,
    id: "queued-video-job",
    type: "video",
    status: "queued",
    queueStage: null,
    prompt: "",
    startedAt: null,
    completedAt: null,
    durationMs: null,
    actualCost: null,
    estimatedCost: null,
    outputs: [],
  },
  {
    ...baseJob,
    id: "slideshow-image-job",
    tags: ["slideshow", "slideshow:project-1"],
    input: { kind: "slideshow-slide-image", projectId: "project-1" },
    outputs: [{ id: "file-1", type: "image" }],
  },
  {
    ...baseJob,
    id: "identity-pack-job",
    tags: ["avatar-identity", "avatar:avatar-1"],
    input: { kind: "avatar-identity-pack", avatarId: "avatar-1" },
  },
  {
    ...baseJob,
    id: "failed-clone-job",
    type: "video",
    model: "kling-3.0-motion",
    status: "failed",
    queueStage: "failed",
    prompt: "Clone the source hook",
    tags: ["ugc-clone"],
    error: "Provider rejected the source clip",
    actualCost: null,
  },
];

function render(overrides: Partial<Parameters<typeof JobsActivity>[0]["activity"]> = {}) {
  return renderToStaticMarkup(
    <JobsActivity
      activity={{
        jobs,
        counts: { processing: 1, queued: 19, completed: 2, failed: 1, failedToday: 1 },
        status: "all",
        type: "all",
        page: 1,
        pageSize: 40,
        filteredTotal: 5,
        now,
        ...overrides,
      }}
    />
  );
}

const markup = render();

assert.match(markup, /Running now/);
assert.match(markup, /Completed 30 days/);
assert.match(markup, /Failed 30 days/);
assert.match(markup, /19 queued/);
assert.match(markup, /1 today/);
assert.match(markup, /Reference image/);
assert.match(markup, /Slideshow image/);
assert.match(markup, /Identity image set/);
assert.match(markup, /UGC clone - Kling 3.0 Motion Control - Provider rejected the source clip/);
assert.match(markup, /title="Provider rejected the source clip"/);
assert.match(markup, /aria-label="Generating"/);
assert.match(markup, />Video generation<\/span><span class="wb-row-sub">Nano Banana 2</);
assert.match(markup, /data-running="true"/);
assert.match(markup, /aria-label="Queued"/);
assert.match(markup, /aria-label="Completed"/);
assert.match(markup, /aria-label="Failed"/);
assert.match(markup, /Today 14:30|Today \d\d:30/);
assert.match(markup, /3m 12s/);
assert.match(markup, /0m 42s/);
assert.match(markup, /\$0\.08/);
assert.match(markup, /src="\/api\/files\/file-1"/);
assert.match(markup, /href="\/slideshow"/);
assert.match(markup, /href="\/characters\?avatarId=avatar-1"/);
assert.match(markup, /href="\/ugc-clone\/failed-clone-job"/);
assert.match(markup, /href="\/generate\/queued-video-job"/);
assert.match(markup, /1-5 \/ 5/);
assert.doesNotMatch(markup, /[\u2013\u2014]/);

assert.match(markup, /href="\/jobs\?status=active"/);
assert.match(markup, /href="\/jobs\?status=completed"/);
assert.match(markup, /href="\/jobs\?status=failed"/);
assert.match(markup, /href="\/jobs\?type=video"/);
assert.match(markup, /aria-current="page"[^>]*>All activity/);
assert.match(markup, /wb-stat-strip/);
assert.match(markup, /wb-table-head/);
assert.match(markup, /wb-row/);
assert.match(markup, /aria-label="Filter jobs by status"/);

const secondPage = render({ page: 2, filteredTotal: 85 });
assert.match(secondPage, /41-80 \/ 85/);
assert.match(secondPage, /href="\/jobs\?page=3"/);
assert.match(secondPage, /href="\/jobs"[^>]*aria-label="Previous page"|aria-label="Previous page"[^>]*href="\/jobs"/);

const failedVideos = render({ jobs: [], status: "failed", type: "video", filteredTotal: 0 });
assert.match(failedVideos, /No failed videos in the last 30 days/);
assert.match(failedVideos, /Show all jobs/);
assert.doesNotMatch(failedVideos, /Previous page/);

const noneRunning = render({ jobs: [], status: "active", filteredTotal: 0 });
assert.match(noneRunning, /No jobs are running/);
assert.match(noneRunning, /href="\/generate"/);

const pastEnd = render({ jobs: [], page: 9, filteredTotal: 5 });
assert.match(pastEnd, /This page is past the last job/);

const quiet = render({ counts: { processing: 0, queued: 0, completed: 0, failed: 0, failedToday: 0 } });
assert.doesNotMatch(quiet, /wb-live-dot/);
assert.doesNotMatch(quiet, /queued</);
assert.doesNotMatch(quiet, / today</);

assert.equal(getJobActivityLabel(jobs[0]), "Reference image");
assert.equal(getJobStatusLabel(jobs[0]), "Generating");
assert.equal(getJobDestination(jobs[2]), "/slideshow");
assert.equal(
  getJobDestination(jobs[3]),
  "/characters?avatarId=avatar-1"
);

const identityPackSource = readFileSync(
  new URL("../../src/lib/ugc/avatar-identity-pack.ts", import.meta.url),
  "utf8"
);
assert.match(identityPackSource, /tags: \["avatar-identity"/);
assert.match(identityPackSource, /"avatar-identity-hairstyles"/);
assert.match(identityPackSource, /completeJob\(/);
assert.match(identityPackSource, /failJob\(/);
assert.match(identityPackSource, /logCost\(/);

console.log("jobs activity tests passed");
