import assert from "node:assert/strict";
import { toJobRow } from "@/app/(app)/jobs/jobs-activity-helpers";
import type { JobActivityItem } from "@/app/(app)/jobs/types";

const now = new Date("2026-06-14T12:00:00Z");

function job(overrides: Partial<JobActivityItem>): JobActivityItem {
  return {
    id: "job-1",
    type: "image",
    model: "nano-banana-2",
    status: "queued",
    queueStage: null,
    prompt: "Desk setup product shot",
    input: {},
    tags: [],
    estimatedCost: null,
    actualCost: null,
    durationMs: null,
    error: null,
    createdAt: new Date("2026-06-14T11:59:00Z"),
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

const queued = toJobRow(job({ estimatedCost: 0.08 }), now);
assert.equal(queued.cost, "$0.08");
assert.equal(queued.costEstimated, true, "a job that has not been charged shows its estimate");

const charged = toJobRow(job({ status: "completed", estimatedCost: 0.08, actualCost: 0.12 }), now);
assert.equal(charged.cost, "$0.12");
assert.equal(charged.costEstimated, false);

const unknown = toJobRow(job({}), now);
assert.equal(unknown.cost, "-");
assert.equal(unknown.costEstimated, false, "a dash is not an estimate");

console.log("jobs row cost tests passed");
