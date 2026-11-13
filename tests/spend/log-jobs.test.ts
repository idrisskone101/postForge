import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { changeLabel, spendChartBars } from "../../src/app/(app)/costs/spend-format";
import { joinCostLogJobs } from "../../src/app/(app)/costs/spend-log-jobs";

const entry = (id: string, jobId: string) => ({
  id,
  jobId,
  model: "nano-banana-2",
  type: "image",
  amount: 0.24,
  createdAt: "2026-08-19T12:51:00.000Z",
});

const rows = joinCostLogJobs(
  [entry("log-1", "job-image"), entry("log-2", "job-video"), entry("log-3", "job-clone"), entry("log-4", "job-gone")],
  [
    {
      id: "job-image",
      type: "image",
      status: "completed",
      model: "nano-banana-2",
      prompt: "Desk setup product shot",
      tags: [],
      input: {},
      outputs: [{ id: "file-1", type: "image" }],
    },
    {
      id: "job-video",
      type: "video",
      status: "completed",
      model: "kling-3.0-pro",
      prompt: "",
      tags: [],
      input: {},
      outputs: [],
    },
    {
      id: "job-clone",
      type: "video",
      status: "completed",
      model: "kling-3.0-pro",
      prompt: "Morning routine clone",
      tags: ["ugc-clone"],
      input: {},
      outputs: [],
    },
  ],
);

assert.deepEqual(rows[0], {
  ...entry("log-1", "job-image"),
  job: {
    title: "Desk setup product shot",
    href: "/generate/job-image",
    thumbnailSrc: "/api/files/file-1/thumbnail?w=240",
  },
});
assert.equal(rows[1].job?.title, "Kling 3.0 Pro", "no prompt falls back to the model name");
assert.equal(rows[1].job?.thumbnailSrc, null, "no image output keeps the media placeholder");
assert.equal(rows[2].job?.href, "/ugc-clone/job-clone", "rows link through the shared job destination");
assert.deepEqual(rows[3], { ...entry("log-4", "job-gone"), job: null }, "a deleted job is never invented");

const loaderSource = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../../src/app/(app)/costs/spend-loader.ts"),
  "utf8",
);
assert.equal(loaderSource.match(/generationJob\.findMany/g)?.length, 1, "one job read per page of cost rows");
assert.match(loaderSource, /where: \{ id: \{ in: jobIds \} \}/);

assert.equal(changeLabel(4.82, 5.48), "-$0.66");
assert.equal(changeLabel(38.1, 31.7), "+$6.40");
assert.equal(changeLabel(1, 0), "+$1.00", "a quiet previous window is a real zero");
assert.equal(changeLabel(1, null), null, "no previous window hides the chip");

const days = Array.from({ length: 90 }, (_, index) => ({ date: `Aug ${index + 1}`, image: 0.1, video: 0.25 }));
const wide = spendChartBars(days, 464);
assert.equal(wide.unit, "day");
assert.equal(wide.bars.length, 90);
assert.equal(wide.barSize, 3);
const narrow = spendChartBars(days, 300);
assert.equal(narrow.unit, "week");
assert.equal(narrow.bars.length, 13);
assert.equal(narrow.bars[0].label, "Aug 1 to Aug 6", "the oldest bucket holds the remainder");
assert.equal(narrow.bars[12].label, "Aug 84 to Aug 90", "the last bucket ends today");
const sum = (bars: Array<{ image: number; video: number }>) =>
  Math.round(bars.reduce((total, bar) => total + bar.image + bar.video, 0) * 100);
assert.equal(sum(narrow.bars), sum(days), "weekly totals equal daily totals");
for (const [count, width] of [[7, 300], [30, 300], [30, 900], [90, 360], [90, 1200]] as const) {
  const chart = spendChartBars(days.slice(0, count), width);
  const slot = width / chart.bars.length;
  assert.ok(chart.barSize >= 3, `${count} at ${width}px: bar ${chart.barSize}px`);
  assert.ok(Math.floor(slot) - chart.barSize >= 1, `${count} at ${width}px: gap below 1px`);
}
