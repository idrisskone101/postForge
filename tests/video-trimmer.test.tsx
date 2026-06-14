import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  VideoTrimmer,
  formatTrimTime,
  getTrimSummary,
  normalizeTrimRange,
} from "../src/components/video-trimmer";

assert.equal(formatTrimTime(1.234), "1.23s");
assert.equal(formatTrimTime(0), "0.00s");

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
