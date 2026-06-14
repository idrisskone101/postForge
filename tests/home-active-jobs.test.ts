import assert from "node:assert/strict";
import {
  getHomeActiveJobCutoff,
  isHomeActiveJob,
} from "../src/lib/jobs/home-active";

const now = new Date("2026-06-14T18:00:00Z");

assert.equal(
  getHomeActiveJobCutoff(now).toISOString(),
  "2026-06-13T18:00:00.000Z"
);

assert.equal(
  isHomeActiveJob(
    {
      status: "queued",
      createdAt: new Date("2026-04-10T02:23:50Z"),
      startedAt: null,
      lockExpiresAt: null,
    },
    now
  ),
  false
);

assert.equal(
  isHomeActiveJob(
    {
      status: "queued",
      createdAt: new Date("2026-06-14T17:45:00Z"),
      startedAt: null,
      lockExpiresAt: null,
    },
    now
  ),
  true
);

assert.equal(
  isHomeActiveJob(
    {
      status: "processing",
      createdAt: new Date("2026-06-12T17:45:00Z"),
      startedAt: new Date("2026-06-14T17:50:00Z"),
      lockExpiresAt: null,
    },
    now
  ),
  true
);

assert.equal(
  isHomeActiveJob(
    {
      status: "completed",
      createdAt: new Date("2026-06-14T17:45:00Z"),
      startedAt: null,
      lockExpiresAt: null,
    },
    now
  ),
  false
);
