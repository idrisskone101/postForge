import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { GalleryPageClient } from "../../src/app/(app)/gallery/gallery-page-client";
import { GalleryFirstPaint } from "../../src/app/(app)/gallery/gallery-first-paint";
import { GalleryLoadErrorState } from "../../src/app/(app)/gallery/gallery-load-error-state";
import { getFailedGalleryActionIds } from "../../src/app/(app)/gallery/gallery-models";
import { GallerySelectionInspector } from "../../src/components/gallery/selection-inspector";
import {
  buildGalleryWhere,
  normalizeGalleryReviewStatusFilter,
} from "../../src/lib/gallery";

const initialPage = {
  nextCursor: "cursor-1",
  hasMore: true,
  reviewCounts: {
    needs_review: 17,
    approved_output: 8,
    rejected_output: 3,
    all: 28,
  },
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
const approvedMarkup = renderToStaticMarkup(
  <GalleryPageClient
    initialPage={initialPage}
    initialType="all"
    initialReviewStatus="approved_output"
  />
);
const firstPaintMarkup = renderToStaticMarkup(<GalleryFirstPaint />);
const emptyMarkup = renderToStaticMarkup(
  <GalleryPageClient
    initialPage={{
      nextCursor: null,
      hasMore: false,
      items: [],
    }}
  />
);
const errorMarkup = renderToStaticMarkup(
  <GalleryLoadErrorState
    message="Failed to load gallery."
    onRetry={() => {}}
  />
);
const longFailureToken = `request_${"x".repeat(512)}`;
const longErrorMarkup = renderToStaticMarkup(
  <GalleryLoadErrorState message={longFailureToken} onRetry={() => {}} />
);
const videoItem = {
  ...initialPage.items[0],
  type: "video" as const,
  reviewStatus: {
    value: "needs_review" as const,
    label: "Needs Review",
    tone: "neutral" as const,
  },
};
const inspectorMarkup = renderToStaticMarkup(
  <GallerySelectionInspector
    selection={{
      item: videoItem,
      position: { index: 0, total: 2 },
      onStep: () => {},
      onOpenPreview: () => {},
      onDownload: () => {},
      onCopySource: () => {},
    }}
  />
);
const singleInspectorMarkup = renderToStaticMarkup(
  <GallerySelectionInspector
    selection={{
      item: { ...initialPage.items[1], type: "image", reviewStatus: { value: "approved_output", label: "Approved Output", tone: "approved" } },
      position: { index: 0, total: 1 },
      onStep: () => {},
      onOpenPreview: () => {},
      onDownload: () => {},
      onCopySource: () => {},
    }}
  />
);

assert.match(firstPaintMarkup, /<h1 class="wb-page-title">Gallery<\/h1>/);
assert.match(firstPaintMarkup, /class="wb-page-header"/);
assert.match(firstPaintMarkup, /href="\/ugc-clone"/);
assert.match(firstPaintMarkup, />Start clone</);
assert.match(firstPaintMarkup, /wb-btn-primary/);
assert.match(firstPaintMarkup, /data-gallery-first-body="true"/);
assert.match(firstPaintMarkup, /wb-skeleton/);
assert.doesNotMatch(firstPaintMarkup, /data-lcp|sr-only|workspace-header-grid|<img/);

assert.match(markup, /aria-label="Review status"/);
assert.match(markup, /aria-label="Media type"/);
assert.match(markup, /aria-label="Grid view"/);
assert.match(markup, /aria-label="List view"/);
assert.match(markup, /Search gallery/);
assert.match(markup, /Sort: Newest/);
assert.ok(markup.indexOf(">All<") < markup.indexOf("Needs review"));
assert.match(markup, /aria-pressed="true"[^>]*>Needs review<span class="wb-segment-count">17<\/span>/);
assert.match(markup, /aria-pressed="true"[^>]*>All media</);
assert.match(markup, /data-gallery-count="true"[^>]*>1 of 17</);
assert.match(markup, /class="wb-tile /);
assert.match(markup, /data-media-preview-frame="card"/);
assert.match(
  markup,
  /aria-label="Select Match the source energy with a polished product demo\., Jun 1\d, \d\d:\d\d"/
);
assert.match(markup, /aria-label="Needs review"/);
assert.match(markup, /class="wb-tile-duration">0:15</);
assert.match(markup, />Preview</);
assert.match(markup, /<a class="wb-tile-action"[^>]*href="\/generate\/job-clone-1">Open<\/a>/);
assert.doesNotMatch(markup, /class="wb-tile-action"[^>]*>Download</);
assert.match(markup, /class="wb-tile-meta">Video - wan-2\.2-video - Jun 1\d</);
assert.match(markup, /Load more/);
assert.doesNotMatch(markup, /\/api\/files\/file-approved"/);
assert.doesNotMatch(markup, /data-gallery-bulk-bar/);
assert.doesNotMatch(markup, /data-gallery-selection-inspector/);
assert.match(markup, /<aside aria-label="Selected output"[^>]*>.*Select media to inspect/s);
assert.match(markup, /data-gallery-dock-row="true"[^>]*>.*data-gallery-count="true"/s);
assert.doesNotMatch(markup, /pf-card|pf-button|pf-review-stamp/);

assert.match(approvedMarkup, /data-gallery-count="true"[^>]*>1 of 8</);
assert.match(approvedMarkup, /\/api\/files\/file-approved/);
assert.doesNotMatch(approvedMarkup, /\/api\/files\/file-needs-review/);
assert.match(approvedMarkup, /aria-label="Approved"/);

assert.match(emptyMarkup, /class="wb-empty /);
assert.match(emptyMarkup, /No outputs yet/);
assert.match(emptyMarkup, /href="\/generate"/);
assert.match(emptyMarkup, /Open Generate/);

assert.match(errorMarkup, /data-tone="error"/);
assert.match(errorMarkup, /Gallery failed to load/);
assert.match(errorMarkup, /Failed to load gallery/);
assert.match(errorMarkup, /Retry Gallery/);
assert.equal(/\s/.test(longFailureToken), false);
assert.match(longErrorMarkup, new RegExp(longFailureToken));
assert.match(longErrorMarkup, /\[overflow-wrap:anywhere\]/);

assert.match(inspectorMarkup, /data-gallery-selection-inspector/);
assert.match(inspectorMarkup, />Selection</);
assert.match(inspectorMarkup, /Previous selected output/);
assert.match(inspectorMarkup, /1 \/ 2/);
assert.match(inspectorMarkup, /aria-label="Inspector view"/);
assert.match(inspectorMarkup, />Source</);
assert.match(inspectorMarkup, /1080 x 1920/);
assert.match(inspectorMarkup, /Video, 9:16/);
assert.match(inspectorMarkup, />0:15</);
assert.match(inspectorMarkup, /Needs review/);
assert.match(inspectorMarkup, /Match the source energy/);
assert.doesNotMatch(inspectorMarkup, /Use in Clone/);
assert.doesNotMatch(singleInspectorMarkup, /Previous selected output/);
assert.doesNotMatch(singleInspectorMarkup, /Inspector view/);
assert.match(singleInspectorMarkup, /Use in Clone/);
assert.match(singleInspectorMarkup, /href="\/ugc-clone\?referenceFileId=file-approved"/);
assert.match(singleInspectorMarkup, /Image, 4:5/);

assert.deepEqual(
  getFailedGalleryActionIds(
    ["asset-1", "asset-2", "asset-3"],
    ["asset-1", "asset-3"]
  ),
  ["asset-2"]
);

assert.deepEqual(
  buildGalleryWhere({ type: "video", reviewStatus: "approved_output" }),
  { type: "video", reviewStatus: "approved_output" }
);
assert.deepEqual(
  buildGalleryWhere({ type: "all", reviewStatus: "needs_review" }),
  {
    reviewStatus: {
      notIn: ["approved_output", "rejected_output"],
    },
  }
);
assert.deepEqual(buildGalleryWhere({ type: "image", reviewStatus: "all" }), {
  type: "image",
});
assert.equal(
  normalizeGalleryReviewStatusFilter("approved_output", "needs_review"),
  "approved_output"
);
assert.equal(
  normalizeGalleryReviewStatusFilter("not-a-status", "needs_review"),
  "needs_review"
);

function componentPropNames(source: string, exportName: string): string[] {
  const marker = `export function ${exportName}({`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${exportName} should be an exported function`);
  const open = start + marker.length - 1;
  const close = source.indexOf("}: {", open);
  assert.ok(close > open, `${exportName} should destructure typed props`);
  return source
    .slice(open + 1, close)
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

const gridSource = readFileSync(
  new URL("../../src/components/gallery-grid.tsx", import.meta.url),
  "utf8"
);
const inspectorSource = readFileSync(
  new URL("../../src/components/gallery/selection-inspector.tsx", import.meta.url),
  "utf8"
);
const pageSource = readFileSync(
  new URL("../../src/app/(app)/gallery/gallery-page-client.tsx", import.meta.url),
  "utf8"
);

assert.deepEqual(componentPropNames(gridSource, "GalleryGrid"), [
  "session",
  "renderHeader",
  "fallback",
  "footer",
]);
assert.deepEqual(
  componentPropNames(inspectorSource, "GallerySelectionInspector"),
  ["selection"]
);
assert.match(gridSource, /export type GalleryGridSession/);
assert.match(inspectorSource, /export type GallerySelection/);
assert.match(pageSource, /<GalleryGrid\s+session=\{gridSession\}/);
assert.doesNotMatch(gridSource, /createContext|useContext/);
assert.doesNotMatch(inspectorSource, /createContext|useContext/);
assert.doesNotMatch(pageSource, /createContext|useContext/);
