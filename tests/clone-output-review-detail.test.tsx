import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CloneOutputReviewDetail,
  type CloneOutputReviewJob,
} from "../src/components/clone-output-review-detail";

const completedJob = {
  id: "job-12345678",
  type: "video",
  model: "wan-2.2-video",
  status: "completed",
  prompt: "Match the source energy with a polished product demo.",
  input: {
    sourceVideo: {
      sourceId: "source-1",
      label: "Morning skincare testimonial",
      originalUrl: "https://www.tiktok.com/@creator/video/123",
      localPath: "/tmp/source.mp4",
      filename: "source.mp4",
      durationSec: 18,
      width: 1080,
      height: 1920,
    },
    savedReferenceId: "reference-1",
    avatarName: "Maya Studio",
  },
  output: null,
  estimatedCost: 0.34,
  actualCost: 0.31,
  durationMs: 124000,
  error: null,
  tags: [],
  outputs: [
    {
      id: "file-1",
      url: "/api/files/file-1",
      type: "video",
      filename: "clone-output.mp4",
      mimeType: "video/mp4",
      width: 1080,
      height: 1920,
      durationSec: 15,
      fileSizeBytes: 24500000,
      reviewStatus: {
        value: "needs_review",
        label: "Needs Review",
        tone: "neutral",
      },
      createdAt: "2026-06-14T12:00:00.000Z",
    },
  ],
  tikTokSource: {
    id: "source-1",
    label: "Morning skincare testimonial",
    originalUrl: "https://www.tiktok.com/@creator/video/123",
  },
  createdAt: "2026-06-14T12:00:00.000Z",
  startedAt: "2026-06-14T12:01:00.000Z",
  completedAt: "2026-06-14T12:03:04.000Z",
} satisfies CloneOutputReviewJob;

const markup = renderToStaticMarkup(
  <CloneOutputReviewDetail
    job={completedJob}
    isRetrying={false}
    onBack={() => {}}
    onRetry={() => {}}
    onDownload={() => {}}
    onNewClone={() => {}}
  />
);

assert.match(markup, /Clone Output/);
assert.match(markup, /Review and approve your generated media asset/);
assert.match(markup, /data-media-preview-frame="detail"/);
assert.match(markup, /object-contain/);
assert.match(markup, /Needs Review/);
assert.match(markup, /Approved Output/);
assert.match(markup, /Rejected Output/);
assert.match(markup, /Download/);
assert.match(markup, /Retry/);
assert.match(markup, /Handoff/);
assert.match(markup, /Source Selection/);
assert.match(markup, /Morning skincare testimonial/);
assert.match(markup, /View source video/);
assert.match(markup, /\/api\/ugc-clone\/preview\?path=%2Ftmp%2Fsource\.mp4/);
assert.doesNotMatch(markup, /<a[^>]+href="\/api\/ugc-clone\/preview/);
assert.match(markup, /Identity Used/);
assert.match(markup, /Maya Studio/);
assert.match(markup, /Production State/);
assert.match(markup, /wan-2\.2-video/);
assert.match(markup, /\$0\.31/);

const portraitSourceFallbackMarkup = renderToStaticMarkup(
  <CloneOutputReviewDetail
    job={{
      ...completedJob,
      outputs: [
        {
          ...completedJob.outputs[0],
          width: null,
          height: null,
        },
      ],
    }}
    isRetrying={false}
    onBack={() => {}}
    onRetry={() => {}}
    onDownload={() => {}}
    onNewClone={() => {}}
  />
);

assert.match(portraitSourceFallbackMarkup, /9:16/);
assert.match(portraitSourceFallbackMarkup, /1080 x 1920/);
