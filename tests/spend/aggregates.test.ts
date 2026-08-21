import assert from "node:assert/strict";
import {
  buildDailyChartSeries,
  costsHref,
  parseLogPage,
  parseSpendPeriod,
  periodChangePercent,
  spendPeriodDays,
  spendWindow,
} from "../../src/lib/costs/spend-period";

assert.equal(parseSpendPeriod(undefined), "30d");
assert.equal(parseSpendPeriod("7d"), "7d");
assert.equal(parseSpendPeriod("90d"), "90d");
assert.equal(parseSpendPeriod("30d"), "30d");
assert.equal(parseSpendPeriod("nope"), "30d");

assert.equal(spendPeriodDays("7d"), 7);
assert.equal(spendPeriodDays("30d"), 30);
assert.equal(spendPeriodDays("90d"), 90);

assert.equal(parseLogPage(undefined), 0);
assert.equal(parseLogPage(""), 0);
assert.equal(parseLogPage("-2"), 0);
assert.equal(parseLogPage("3.9"), 3);
assert.equal(parseLogPage("2"), 2);

const now = new Date(2026, 5, 21, 15, 4, 5);
const window7 = spendWindow("7d", now);
assert.equal(window7.periodDays, 7);
assert.equal(window7.start.getHours(), 0);
assert.equal(window7.start.getDate(), 15);
assert.equal(window7.end.getDate(), 22);
assert.equal(window7.previousStart.getDate(), 8);

assert.equal(periodChangePercent(120, 100), 20);
assert.equal(periodChangePercent(80, 100), -20);
assert.equal(periodChangePercent(50, 0), 0);
assert.equal(periodChangePercent(50, -10), 0);

const start = new Date(2026, 5, 1);
start.setHours(0, 0, 0, 0);
const series = buildDailyChartSeries(start, 3, [
  { day: "2026-06-01", type: "image", cost: 1.111 },
  { day: "2026-06-02", type: "video", cost: 2 },
]);
assert.equal(series.length, 3);
assert.equal(series[0].image, 1.11);
assert.equal(series[0].video, 0);
assert.equal(series[1].image, 0);
assert.equal(series[1].video, 2);
assert.equal(series[2].image, 0);
assert.equal(series[2].video, 0);

const outsideWindow = buildDailyChartSeries(start, 1, [
  { day: "2026-05-31", type: "image", cost: 9 },
]);
assert.equal(outsideWindow.length, 1);
assert.equal(outsideWindow[0].image, 0);
assert.equal(outsideWindow[0].video, 0);

assert.equal(costsHref("30d", 0), "/costs?period=30d");
assert.equal(costsHref("7d", 2), "/costs?period=7d&logPage=2");
