import assert from "node:assert/strict";
import { formatCostLogCsv } from "../../src/lib/costs/spend-period";

const header = "Date,Job,Model,Type,Amount";

assert.equal(formatCostLogCsv([]), header);
assert.doesNotMatch(formatCostLogCsv([]), /job-/);
assert.doesNotMatch(formatCostLogCsv([]), /0\.00/);

const csv = formatCostLogCsv([
  {
    createdAt: "2026-06-12T12:00:00.000Z",
    jobId: 'job, "quoted"',
    model: "flux-pro",
    type: "image",
    amount: 1.2,
  },
  {
    createdAt: "2026-06-11T12:00:00.000Z",
    jobId: "job-plain",
    model: "kling-3.0-motion",
    type: "video",
    amount: 2,
  },
]);
assert.equal(
  csv,
  [
    header,
    '2026-06-12T12:00:00.000Z,"job, ""quoted""",flux-pro,image,1.2',
    "2026-06-11T12:00:00.000Z,job-plain,kling-3.0-motion,video,2",
  ].join("\n")
);
assert.equal(csv.split("\n").length, 3);
