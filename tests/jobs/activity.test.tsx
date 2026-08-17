import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { JobsActivity } from "../../src/app/jobs/jobs-activity";
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
    completedAt: null,
    durationMs: null,
  },
  {
    ...baseJob,
    id: "slideshow-image-job",
    tags: ["slideshow", "slideshow:project-1"],
    input: { kind: "slideshow-slide-image", projectId: "project-1" },
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

const markup = renderToStaticMarkup(
  <JobsActivity
    jobs={jobs}
    counts={{ active: 1, completed: 2, failed: 1, total: 4 }}
    status="all"
    type="all"
    page={1}
    pageSize={40}
    filteredTotal={4}
  />
);

assert.match(markup, /Running now/);
assert.match(markup, /Completed · 30 days/);
assert.match(markup, /Created · 30 days/);
assert.match(markup, /Reference image/);
assert.match(markup, /Slideshow image/);
assert.match(markup, /Identity image set/);
assert.match(markup, /UGC clone/);
assert.match(markup, /Generating/);
assert.match(markup, /Provider rejected the source clip/);
assert.match(markup, /href="\/slideshow"/);
assert.match(markup, /href="\/characters\?avatarId=avatar-1"/);
assert.match(markup, /href="\/ugc-clone\/failed-clone-job"/);
assert.match(markup, /1–4 of 4 jobs/);

assert.equal(getJobActivityLabel(jobs[0]), "Reference image");
assert.equal(getJobStatusLabel(jobs[0]), "Generating");
assert.equal(getJobDestination(jobs[1]), "/slideshow");
assert.equal(
  getJobDestination(jobs[2]),
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
