import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CloneOutputReviewDetail,
  type CloneOutputReviewJob,
} from "../../src/components/clone-output-review-detail";

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
    avatarId: "avatar-456",
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
    review={{
      job: completedJob,
      isRetrying: false,
      onRetry: () => {},
      onDownload: () => {},
      onNewClone: () => {},
    }}
  />
);

assert.match(markup, /Morning skincare testimonial/);
assert.match(markup, /data-clone-output-media="video"/);
assert.match(markup, /object-contain/);
assert.match(markup, /Approve output/);
assert.match(markup, /Reject output/);
assert.match(markup, /New clone/);
assert.equal((markup.match(/Output review status:/g) ?? []).length, 0);
assert.match(markup, /aria-label="Download output"/);
assert.match(markup, /aria-label="Retry clone"/);
assert.match(markup, /Handoff/);
assert.match(markup, /View original/);
assert.match(markup, /href="https:\/\/www\.tiktok\.com\/@creator\/video\/123"/);
assert.match(markup, /View source video/);
assert.match(markup, /\/api\/ugc-clone\/preview\?path=%2Ftmp%2Fsource\.mp4/);
assert.doesNotMatch(markup, /<a[^>]+href="\/api\/ugc-clone\/preview/);
assert.match(markup, /Maya Studio/);
assert.match(markup, /src="\/api\/avatars\/avatar-456"/);
assert.match(markup, /wan-2\.2-video/);
assert.match(markup, /\$0\.31/);
assert.match(markup, /2 min 4 s/);
assert.match(markup, /1080 x 1920/);
assert.match(markup, /Input checks/);
assert.match(markup, /4 \/ 4/);
assert.doesNotMatch(markup, /wb-step-rail/);
assert.doesNotMatch(markup, /#[0-9A-Fa-f]{6}/);

const longFailureToken = `request_${"x".repeat(512)}`;
const longFailureMarkup = renderToStaticMarkup(
  <CloneOutputReviewDetail
    review={{
      job: {
        ...completedJob,
        status: "failed",
        error: longFailureToken,
        outputs: [],
      },
      isRetrying: false,
      actionFeedback: { tone: "error", message: longFailureToken },
      onRetry: () => {},
      onDownload: () => {},
      onNewClone: () => {},
    }}
  />
);

assert.equal(/\s/.test(longFailureToken), false);
assert.match(longFailureMarkup, new RegExp(longFailureToken));
assert.match(longFailureMarkup, /\[overflow-wrap:anywhere\]/);
assert.match(longFailureMarkup, /Clone failed/);
assert.match(longFailureMarkup, /Retry clone/);
assert.doesNotMatch(longFailureMarkup, /Approve output/);
assert.match(longFailureMarkup, /wb-step-rail/);
assert.match(longFailureMarkup, />Queued</);
assert.match(longFailureMarkup, /Processing/);
assert.match(longFailureMarkup, /, failed/);

const portraitSourceFallbackMarkup = renderToStaticMarkup(
  <CloneOutputReviewDetail
    review={{
      job: {
        ...completedJob,
        outputs: [
          {
            ...completedJob.outputs[0],
            width: null,
            height: null,
          },
        ],
      },
      isRetrying: false,
      onRetry: () => {},
      onDownload: () => {},
      onNewClone: () => {},
    }}
  />
);

assert.match(portraitSourceFallbackMarkup, /aspect-ratio:1080 \/ 1920/);
assert.match(portraitSourceFallbackMarkup, /Resolution<\/dt><dd>-</);

const uuidOnlyAvatarId = "8e18566f-49cf-4607-ace1-15b6161d00cc";
const avatarFallbackMarkup = renderToStaticMarkup(
  <CloneOutputReviewDetail
    review={{
      job: {
        ...completedJob,
        input: {
          ...completedJob.input,
          avatarId: uuidOnlyAvatarId,
          avatarName: undefined,
          identityName: undefined,
        },
      },
      isRetrying: false,
      onRetry: () => {},
      onDownload: () => {},
      onNewClone: () => {},
    }}
  />
);

assert.match(avatarFallbackMarkup, /AI avatar profile/);
assert.match(
  avatarFallbackMarkup,
  /src="\/api\/avatars\/8e18566f-49cf-4607-ace1-15b6161d00cc"/
);
assert.doesNotMatch(
  avatarFallbackMarkup,
  />8e18566f-49cf-4607-ace1-15b6161d00cc</
);

const collectionReferenceMarkup = renderToStaticMarkup(
  <CloneOutputReviewDetail
    review={{
      job: {
        ...completedJob,
        input: {
          ...completedJob.input,
          savedReferenceId: undefined,
          referenceImageFileId: undefined,
          collectionAssetId: "collection asset/portrait-1",
        },
      },
      isRetrying: false,
      onRetry: () => {},
      onDownload: () => {},
      onNewClone: () => {},
    }}
  />
);

assert.match(collectionReferenceMarkup, /Collection reference/);
assert.match(collectionReferenceMarkup, /collection asset\/portrait-1/);
assert.match(
  collectionReferenceMarkup,
  /src="\/api\/files\/collection%20asset%2Fportrait-1"/
);

function renderJob(
  job: CloneOutputReviewJob,
  extra: Partial<Parameters<typeof CloneOutputReviewDetail>[0]["review"]> = {}
) {
  return renderToStaticMarkup(
    <CloneOutputReviewDetail
      review={{
        job,
        isRetrying: false,
        onRetry: () => {},
        onDownload: () => {},
        onNewClone: () => {},
        ...extra,
      }}
    />
  );
}

const generatingMarkup = renderJob({
  ...completedJob,
  status: "processing",
  queueStage: "submitted",
  outputs: [],
  durationMs: null,
});
assert.match(generatingMarkup, /wb-step-rail/);
assert.match(generatingMarkup, /data-state="current"[^>]*>.*?Generating/);
assert.equal((generatingMarkup.match(/data-state="done"/g) ?? []).length, 2);
assert.match(generatingMarkup, /wb-live-dot/);
assert.match(generatingMarkup, /Started /);
assert.match(generatingMarkup, /Time<\/dt><dd>-</);
assert.doesNotMatch(generatingMarkup, /aria-label="Download output"/);
assert.doesNotMatch(generatingMarkup, /wb-meter|role="progressbar"/);
assert.match(generatingMarkup, /<button[^>]*disabled[^>]*>.*?Approve output/);

const queuedMarkup = renderJob({
  ...completedJob,
  status: "queued",
  queueStage: "queued",
  startedAt: null,
  outputs: [],
});
assert.match(queuedMarkup, /data-state="current"[^>]*>.*?Queued/);
assert.match(queuedMarkup, />Queued \d/);

const savingMarkup = renderJob({
  ...completedJob,
  status: "processing",
  queueStage: "downloading",
  outputs: [],
});
assert.match(savingMarkup, /data-state="current"[^>]*>.*?Saving output/);

const knownFailureMarkup = renderJob({
  ...completedJob,
  status: "failed",
  queueStage: "preparing",
  error: "Source clip could not be read",
  outputs: [],
});
assert.match(knownFailureMarkup, /Preparing<span class="sr-only">, failed/);
assert.match(knownFailureMarkup, /Source clip could not be read/);

const unstartedFailureMarkup = renderJob({
  ...completedJob,
  status: "failed",
  queueStage: "failed",
  startedAt: null,
  error: "Queue rejected",
  outputs: [],
});
assert.match(unstartedFailureMarkup, /Queued<span class="sr-only">, failed/);

const retryingMarkup = renderJob(
  { ...completedJob, status: "failed", error: "x", outputs: [] },
  { isRetrying: true }
);
assert.match(retryingMarkup, /<button[^>]*disabled[^>]*>.*?Retrying clone/);

const approvedMarkup = renderJob({
  ...completedJob,
  outputs: [
    {
      ...completedJob.outputs[0],
      reviewStatus: { value: "approved_output", label: "Approved Output", tone: "approved" },
    },
  ],
});
assert.match(approvedMarkup, /aria-pressed="true"[^>]*>.*?Approved</);
assert.match(approvedMarkup, /Reject output/);

const rejectedMarkup = renderJob({
  ...completedJob,
  outputs: [
    {
      ...completedJob.outputs[0],
      reviewStatus: { value: "rejected_output", label: "Rejected Output", tone: "rejected" },
    },
  ],
});
assert.match(rejectedMarkup, /aria-pressed="true"[^>]*>.*?Rejected</);
assert.match(rejectedMarkup, /Approve output/);

const pendingMarkup = renderJob(completedJob, { pendingReviewStatus: "approved_output" });
assert.match(pendingMarkup, /Approving/);

const variantsMarkup = renderJob({
  ...completedJob,
  outputs: [
    completedJob.outputs[0],
    { ...completedJob.outputs[0], id: "file-2" },
    { ...completedJob.outputs[0], id: "file-3" },
  ],
});
assert.equal((variantsMarkup.match(/aria-label="View variant \d"/g) ?? []).length, 3);
assert.match(variantsMarkup, /1 \/ 3/);

const toastMarkup = renderJob(completedJob, {
  actionFeedback: { tone: "success", message: "Output approved and ready for handoff." },
});
assert.match(toastMarkup, /wb-toast-region/);
assert.match(toastMarkup, /role="status"/);
