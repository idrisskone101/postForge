import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { GalleryPageClient } from "../src/app/gallery/gallery-page-client";

const initialPage = {
  nextCursor: null,
  hasMore: false,
  items: [
    {
      id: "file-needs-review",
      jobId: "job-clone-1",
      type: "video",
      url: "/api/files/file-needs-review",
      filename: "clone-output.mp4",
      width: 1080,
      height: 1920,
      durationSec: 15,
      model: "wan-2.2-video",
      prompt: "Match the source energy with a polished product demo.",
      tiktokSourceUrl: "https://www.tiktok.com/@creator/video/123",
      reviewStatus: {
        value: "needs_review",
        label: "Needs Review",
        tone: "neutral",
      },
      createdAt: "2026-06-14T12:00:00.000Z",
    },
    {
      id: "file-approved",
      jobId: "job-clone-2",
      type: "image",
      url: "/api/files/file-approved",
      filename: "approved-output.png",
      width: 1080,
      height: 1350,
      model: "imagen-4",
      prompt: "Approved creator still.",
      reviewStatus: {
        value: "approved_output",
        label: "Approved Output",
        tone: "approved",
      },
      createdAt: "2026-06-14T11:00:00.000Z",
    },
  ],
};

const markup = renderToStaticMarkup(
  <GalleryPageClient initialPage={initialPage} />
);

assert.match(markup, /Output Review/);
assert.match(markup, /Review, approve, reject, download, and hand off Outputs/);
assert.match(markup, /Needs Review/);
assert.match(markup, /Approved Output/);
assert.match(markup, /Rejected Output/);
assert.match(markup, /All/);
assert.match(markup, /whitespace-nowrap/);
assert.match(markup, /Media type/);
assert.ok(markup.indexOf("Needs Review") < markup.indexOf("Media type"));
assert.match(markup, /bg-muted text-foreground[^>]*>Videos/);
assert.match(markup, /1 Output needs review/);
assert.match(markup, /data-media-preview-frame="card"/);
assert.match(markup, /object-cover/);
assert.match(markup, /aria-label="Open Source Selection"/);
assert.doesNotMatch(markup, />Source Selection</);
assert.doesNotMatch(markup, />https:\/\/www\.tiktok\.com\/@creator\/video\/123</);
assert.match(markup, /wan-2\.2-video/);
assert.match(markup, /Preview/);
assert.match(markup, /Mark as Approved Output/);
assert.match(markup, /Mark as Rejected Output/);
assert.match(markup, /aria-label="Copy Source URL"/);
assert.match(markup, /Download/);
assert.match(markup, /Handoff/);
assert.doesNotMatch(markup, /clone-output\.mp4/);
assert.doesNotMatch(markup, /Match the source energy/);
assert.doesNotMatch(markup, /Approved creator still/);
