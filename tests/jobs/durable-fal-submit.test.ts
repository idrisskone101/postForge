import assert from "node:assert/strict";

import { submitDurableFalRequest } from "../../src/lib/jobs/durable-fal-submit";

(async () => {
  assert.deepEqual(
    await submitDurableFalRequest({
      claim: async () => false,
      submit: async () => {
        throw new Error("submit should not run");
      },
      persistRequestId: async () => {
        throw new Error("persist should not run");
      },
      onAmbiguous: async () => "error",
    }),
    {
      outcome: "unclaimed",
      claimed: false,
      submitted: false,
      persisted: false,
    },
  );

  let started = 0;
  assert.deepEqual(
    await submitDurableFalRequest({
      claim: async () => true,
      submit: async () => ({ request_id: " fal-1 " }),
      persistRequestId: async (requestId) => {
        assert.equal(requestId, "fal-1");
        return true;
      },
      onAmbiguous: async () => "error",
      onStarted: () => {
        started += 1;
      },
    }),
    {
      outcome: "submitted",
      claimed: true,
      submitted: true,
      persisted: true,
    },
  );
  assert.equal(started, 1);

  let rejected = 0;
  assert.deepEqual(
    await submitDurableFalRequest({
      claim: async () => true,
      submit: async () => {
        throw new Error("provider unavailable");
      },
      persistRequestId: async () => true,
      onRejectedBeforeAccept: async (error) => {
        rejected += 1;
        assert.equal(error.message, "provider unavailable");
        return "failed";
      },
      onAmbiguous: async () => "error",
    }),
    {
      outcome: "failed",
      claimed: true,
      submitted: false,
      persisted: false,
    },
  );
  assert.equal(rejected, 1);

  let ambiguous = 0;
  assert.deepEqual(
    await submitDurableFalRequest({
      claim: async () => true,
      submit: async () => ({ request_id: "fal-3" }),
      persistRequestId: async () => false,
      onAmbiguous: async (error) => {
        ambiguous += 1;
        assert.match(error.message, /could not be persisted/);
        return "error";
      },
    }),
    {
      outcome: "error",
      claimed: true,
      submitted: true,
      persisted: false,
    },
  );
  assert.equal(ambiguous, 1);

  assert.deepEqual(
    await submitDurableFalRequest({
      claim: async () => true,
      submit: async () => ({ request_id: "fal-4" }),
      persistRequestId: async () => {
        throw new Error("database unavailable");
      },
      onRejectedBeforeAccept: async () => "failed",
      onAmbiguous: async (error) => {
        assert.equal(error.message, "database unavailable");
        return "submission-unknown";
      },
    }),
    {
      outcome: "submission-unknown",
      claimed: true,
      submitted: true,
      persisted: false,
    },
  );

  console.log("durable fal submit tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
