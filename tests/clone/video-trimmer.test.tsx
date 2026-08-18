import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  VideoTrimmer,
  formatTrimTime,
  getTrimSummary,
  normalizeTrimRange,
} from "../../src/components/video-trimmer";
import { isMotionSourceWithinLimit } from "../../src/lib/ugc/source-limits";

assert.equal(formatTrimTime(1.234), "1.23s");
assert.equal(formatTrimTime(0), "0.00s");
assert.equal(isMotionSourceWithinLimit(30.4), true);
assert.equal(isMotionSourceWithinLimit(30.6), false);

assert.deepEqual(
  normalizeTrimRange({
    startTime: 0.114,
    endTime: 3.399,
    durationSec: 3.4,
  }),
  {
    startTime: 0.11,
    endTime: 3.4,
    trimmedDuration: 3.29,
    removedFromStart: 0.11,
    removedFromEnd: 0,
    hasTrim: true,
  }
);

assert.equal(
  getTrimSummary({
    startTime: 0,
    endTime: 3.4,
    durationSec: 3.4,
  }),
  "Full video selected. No trim will be applied."
);

assert.equal(
  getTrimSummary({
    startTime: 0.25,
    endTime: 2.9,
    durationSec: 3.4,
  }),
  "Will submit 0.25s - 2.90s. Removes 0.25s from start and 0.50s from end."
);

assert.deepEqual(
  normalizeTrimRange({
    startTime: 20,
    endTime: 61.1,
    durationSec: 61.1,
    maxDurationSec: 30,
  }),
  {
    startTime: 20,
    endTime: 50,
    trimmedDuration: 30,
    removedFromStart: 20,
    removedFromEnd: 11.1,
    hasTrim: true,
  }
);

assert.equal(
  getTrimSummary({
    startTime: 0,
    endTime: 61.1,
    durationSec: 61.1,
    maxDurationSec: 30,
  }),
  "Will submit 0.00s - 30.00s. Removes 31.10s from end."
);

const markup = renderToStaticMarkup(
  <VideoTrimmer
    videoPath="ugc-clone-sources/example.mp4"
    durationSec={3.4}
    width={1080}
    height={1920}
    onTrimmed={() => {}}
    onCancel={() => {}}
  />
);

assert.match(markup, /Precise range/);
assert.match(markup, /Start/);
assert.match(markup, /End/);
assert.match(markup, /Removed from start/);
assert.match(markup, /Removed from end/);
assert.match(markup, /data-filmstrip-placeholder="true"/);
assert.doesNotMatch(markup, /animate-pulse/);

const longSourceMarkup = renderToStaticMarkup(
  <VideoTrimmer
    videoPath="ugc-clone-sources/long-example.mp4"
    durationSec={61.1}
    width={1080}
    height={1920}
    onTrimmed={() => {}}
    onCancel={() => {}}
  />
);

assert.match(longSourceMarkup, /30.00s selected/);
assert.match(longSourceMarkup, /Trim required/);
assert.doesNotMatch(longSourceMarkup, /Use Full Video/);
