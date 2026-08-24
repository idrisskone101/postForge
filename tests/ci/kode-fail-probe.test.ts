import assert from "node:assert/strict";

assert.equal(
  "kode-fail-probe",
  "should-not-pass",
  "intentional fail: confirm kode stays red and merge does not run"
);
