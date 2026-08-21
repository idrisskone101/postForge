import assert from "node:assert/strict";

import type {
  GeneratedFile,
  GenerationJob,
} from "../../src/generated/prisma/client";
import { calculateEstimatedCost, getModel } from "../../src/lib/ai/models";
import {
  buildSlideshowImageQueueRequest,
  recoverQueuedSlideshowImageJobs,
  submitReservedSlideshowImage,
  type SlideshowImageSubmissionDependencies,
} from "../../src/lib/ai/slideshow-image";
import {
  pollSingleJob,
  type FalJobPollDependencies,
} from "../../src/lib/jobs/poll-fal-job";
import { runSlideshowMaintenanceTick } from "../../src/lib/slideshow/maintenance";

const now = new Date("2026-08-03T16:00:00.000Z");
const oldStartedAt = new Date(now.getTime() - 60 * 60 * 1000);
const job: GenerationJob = {
  id: "persisted-slideshow-job",
  type: "image",
  model: "nano-banana-2",
  status: "processing",
  prompt: "A calm editorial morning routine",
  input: {
    kind: "slideshow-slide-image",
    projectId: "project-1",
    slideId: "slide-1",
    falEndpoint: "fal-ai/nano-banana-2",
  },
  output: null,
  falRequestId: "persisted-fal-request",
  queueStage: null,
  lockOwner: null,
  lockExpiresAt: null,
  attempts: 0,
  nextAttemptAt: null,
  lastPolledAt: null,
  estimatedCost: 0.08,
  actualCost: null,
  durationMs: null,
  error: null,
  createdAt: oldStartedAt,
  startedAt: oldStartedAt,
  completedAt: null,
  tags: ["slideshow", "slideshow:project-1", "slide:slide-1"],
};

const generatedFile: GeneratedFile = {
  id: "generated-file-1",
  jobId: job.id,
  type: "image",
  originalUrl: "https://fal.example/result.png",
  localPath: "images/persisted-slideshow-job-0.png",
  filename: "persisted-slideshow-job-0.png",
  mimeType: "image/png",
  width: 1080,
  height: 1920,
  durationSec: null,
  fileSizeBytes: 4,
  reviewStatus: "needs_review",
  data: null,
  createdAt: now,
};

const calls: string[] = [];
const dependencies: FalJobPollDependencies = {
  getModel,
  calculateEstimatedCost,
  checkQueueStatus: async () => ({ status: "COMPLETED" }),
  getQueueResult: async () => ({
    data: {
      images: [
        {
          url: generatedFile.originalUrl,
          width: generatedFile.width,
          height: generatedFile.height,
        },
      ],
    },
  }),
  findPrimaryImage: async () => null,
  downloadFromUrl: async () => ({
    buffer: Buffer.from("test"),
    contentType: "image/png",
  }),
  saveFile: async () => {
    calls.push("stored");
    return generatedFile.localPath;
  },
  addGeneratedFile: async () => {
    calls.push("file-recorded");
    return generatedFile;
  },
  attachSlideshowGeneratedFile: async () => {
    calls.push("attached");
  },
  completeJob: async () => {
    calls.push("completed");
  },
  failJob: async () => {
    calls.push("failed");
  },
  logCost: async (jobId, model, type, amount, details) => ({
    id: "cost-1",
    jobId,
    model,
    type,
    amount,
    details: details ?? null,
    createdAt: now,
  }),
  now: () => now.getTime(),
};

async function main() {
  const queueRequest = buildSlideshowImageQueueRequest({
    projectId: "project-1",
    slideId: "slide-1",
    prompt: "A calm editorial morning routine",
    aspectRatio: "9:16",
  });

  // Submission claims the persisted reservation before calling Fal. Two
  // callers racing on the same job therefore produce one provider request.
  let leaseHeld = false;
  let providerSubmissions = 0;
  let processingWrites = 0;
  let pollerStarts = 0;
  const submissionDependencies: SlideshowImageSubmissionDependencies = {
    createLeaseOwner: (() => {
      let sequence = 0;
      return () => `worker-${++sequence}`;
    })(),
    now: () => now,
    claimQueuedJob: async () => {
      if (leaseHeld) return false;
      leaseHeld = true;
      return true;
    },
    submitToQueue: async () => {
      providerSubmissions += 1;
      await Promise.resolve();
      return { request_id: "fal-request-1" };
    },
    markProcessing: async () => {
      processingWrites += 1;
      return true;
    },
    failClaimedJob: async () => true,
    startPoller: () => {
      pollerStarts += 1;
    },
  };
  const concurrentSubmissions = await Promise.all([
    submitReservedSlideshowImage(
      "queued-job-1",
      queueRequest,
      submissionDependencies,
    ),
    submitReservedSlideshowImage(
      "queued-job-1",
      queueRequest,
      submissionDependencies,
    ),
  ]);
  assert.equal(providerSubmissions, 1);
  assert.equal(processingWrites, 1);
  assert.equal(pollerStarts, 1);
  assert.equal(
    concurrentSubmissions.filter((result) => result.outcome === "submitted")
      .length,
    1,
  );
  assert.equal(
    concurrentSubmissions.filter((result) => result.outcome === "unclaimed")
      .length,
    1,
  );

  // Provider rejection fails only the reservation owned by this submitter.
  let failedLeaseOwner = "";
  const rejectedSubmission = await submitReservedSlideshowImage(
    "queued-job-2",
    queueRequest,
    {
      ...submissionDependencies,
      createLeaseOwner: () => "rejecting-worker",
      claimQueuedJob: async () => true,
      submitToQueue: async () => {
        throw new Error("provider unavailable");
      },
      failClaimedJob: async (_jobId, leaseOwner, error) => {
        failedLeaseOwner = leaseOwner;
        assert.equal(error, "provider unavailable");
        return true;
      },
    },
  );
  assert.equal(rejectedSubmission.outcome, "failed");
  assert.equal(failedLeaseOwner, "rejecting-worker");

  const persistedQueuedJob = {
    id: "queued-valid",
    model: queueRequest.model,
    prompt: queueRequest.prompt,
    input: queueRequest.jobInput,
    estimatedCost: queueRequest.estimatedCost,
    tags: queueRequest.tags,
    attempts: 0,
  };
  const malformedQueuedJob = {
    ...persistedQueuedJob,
    id: "queued-malformed",
    input: { kind: "slideshow-slide-image" },
  };
  const ambiguousQueuedJob = {
    ...persistedQueuedJob,
    id: "queued-submission-unknown",
    attempts: 1,
  };
  let restoredEndpoint = "";
  let restoredInput: Record<string, unknown> | undefined;
  let malformedError = "";
  let submissionUnknownError = "";
  let recoveredSubmissions = 0;
  const queuedRecovery = await recoverQueuedSlideshowImageJobs({
    dependencies: {
      now: () => now,
      listQueuedJobs: async () => [
        persistedQueuedJob,
        malformedQueuedJob,
        ambiguousQueuedJob,
      ],
      submit: async (_jobId, request) => {
        recoveredSubmissions += 1;
        restoredEndpoint = request.endpoint;
        restoredInput = request.falInput;
        return {
          claimed: true,
          submitted: true,
          persisted: true,
          outcome: "submitted",
        };
      },
      failQueuedJob: async (jobId, error) => {
        if (jobId === malformedQueuedJob.id) malformedError = error;
        if (jobId === ambiguousQueuedJob.id) submissionUnknownError = error;
        return true;
      },
    },
  });
  assert.equal(recoveredSubmissions, 1);
  assert.equal(restoredEndpoint, queueRequest.endpoint);
  assert.deepEqual(restoredInput, queueRequest.falInput);
  assert.match(malformedError, /missing its project or slide/i);
  assert.match(submissionUnknownError, /duplicate charge/i);
  assert.deepEqual(queuedRecovery, {
    candidates: 3,
    claimed: 3,
    submitted: 1,
    persisted: 1,
    failed: 2,
    skipped: 0,
    errors: 0,
  });

  // Recovery happens from the persisted Fal request after a process restart. The
  // old start time deliberately exceeds the live-poller timeout: a completed
  // remote result must still be stored and attached before the job is completed.
  assert.equal(await pollSingleJob(job, dependencies), "completed");
  assert.deepEqual(calls, ["stored", "file-recorded", "attached", "completed"]);
  assert.ok(calls.indexOf("attached") < calls.indexOf("completed"));

  // A closed tab triggers no job-status GET. The secured maintenance entrypoint
  // still invokes both durable server responsibilities directly.
  const maintenanceCalls: string[] = [];
  const maintenance = await runSlideshowMaintenanceTick({
    recoverQueuedImageJobs: async () => {
      maintenanceCalls.push("queued-recovery");
      return {
        candidates: 1,
        claimed: 1,
        submitted: 1,
        persisted: 1,
        failed: 0,
        skipped: 0,
        errors: 0,
      };
    },
    runAutomationTick: async () => {
      maintenanceCalls.push("automations");
    },
    recoverImageJobs: async () => {
      assert.equal(maintenanceCalls[0], "queued-recovery");
      maintenanceCalls.push("image-recovery");
      return {
        candidates: 1,
        claimed: 1,
        completed: 1,
        failed: 0,
        waiting: 0,
        errors: 0,
      };
    },
  });
  assert.deepEqual(maintenanceCalls.sort(), [
    "automations",
    "image-recovery",
    "queued-recovery",
  ]);
  assert.equal(maintenance.queuedImageJobs.persisted, 1);
  assert.equal(maintenance.imageJobs.completed, 1);

  // Only still-running requests time out; completion is checked first above.
  const timeoutCalls: string[] = [];
  const timeoutOutcome = await pollSingleJob(job, {
    ...dependencies,
    checkQueueStatus: async () => ({
      status: "IN_PROGRESS",
    }),
    failJob: async (_jobId, error) => {
      timeoutCalls.push(error);
    },
  });
  assert.equal(timeoutOutcome, "failed");
  assert.deepEqual(timeoutCalls, ["Job timed out after 15 minutes"]);

  // A transient attachment/database failure leaves the persisted job pending.
  // A later process can retry the same Fal result without regenerating or
  // downloading the already stored file.
  let attachAttempts = 0;
  let completedAttempts = 0;
  let failedAttempts = 0;
  const retryDependencies: FalJobPollDependencies = {
    ...dependencies,
    findPrimaryImage: async () => generatedFile,
    attachSlideshowGeneratedFile: async () => {
      attachAttempts += 1;
      if (attachAttempts === 1) throw new Error("temporary database outage");
    },
    completeJob: async () => {
      completedAttempts += 1;
    },
    failJob: async () => {
      failedAttempts += 1;
    },
  };
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    assert.equal(await pollSingleJob(job, retryDependencies), "waiting");
    assert.equal(await pollSingleJob(job, retryDependencies), "completed");
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(attachAttempts, 2);
  assert.equal(completedAttempts, 1);
  assert.equal(failedAttempts, 0);

  console.log("slideshow image recovery tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
