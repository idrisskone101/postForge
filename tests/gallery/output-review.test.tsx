import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { GalleryPageClient } from "../../src/app/(app)/gallery/gallery-page-client";
import { GalleryFirstPaint } from "../../src/app/(app)/gallery/gallery-first-paint";
import { GalleryHeaderControls } from "../../src/app/(app)/gallery/gallery-header-controls";
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
const headerControlsMarkup = renderToStaticMarkup(<GalleryHeaderControls />);
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
const inspectorMarkup = renderToStaticMarkup(
  <GallerySelectionInspector
    selection={{
      item: {
        ...initialPage.items[0],
        type: "video",
        reviewStatus: {
          value: "needs_review",
          label: "Needs Review",
          tone: "neutral",
        },
      },
      onDeselect: () => {},
      onOpenPreview: () => {},
      onDelete: async () => true,
    }}
  />
);

assert.doesNotMatch(markup, /Output Review/);
assert.doesNotMatch(markup, /Review, approve, reject, download, and hand off Outputs/);
assert.match(headerControlsMarkup, /href="\/ugc-clone"/);
assert.match(headerControlsMarkup, /Start Clone/);
assert.match(headerControlsMarkup, /href="\/generate"/);
assert.match(headerControlsMarkup, /Generate asset/);
assert.match(firstPaintMarkup, /data-gallery-first-paint="true"/);
assert.match(firstPaintMarkup, /data-gallery-page="true"/);
assert.match(firstPaintMarkup, /data-gallery-toolbar="true"/);
assert.match(firstPaintMarkup, />Start Clone</);
assert.match(firstPaintMarkup, />Open Generate</);
assert.match(firstPaintMarkup, /fetchPriority="high"/);
assert.match(firstPaintMarkup, /data:image\/svg\+xml/);
assert.match(markup, /Needs Review/);
assert.match(markup, /Approved Output/);
assert.match(markup, /Rejected Output/);
assert.match(markup, /All/);
assert.match(markup, /whitespace-nowrap/);
assert.match(markup, /Media type/);
assert.match(markup, /Search gallery/);
assert.match(markup, /aria-label="Grid view"/);
assert.match(markup, /aria-label="List view"/);
assert.ok(markup.indexOf("Needs Review") < markup.indexOf("Media type"));
assert.match(markup, /bg-\[var\(--pf-surface\)\] text-\[var\(--pf-ink\)\][^>]*>Videos/);
assert.match(markup, /pf-card/);
assert.match(markup, /pf-data/);
assert.match(markup, /pf-button-secondary/);
assert.match(markup, /Showing 1 of 17 outputs needing review/);
assert.match(markup, />17</);
assert.match(markup, />8</);
assert.match(markup, />3</);
assert.match(markup, />28</);
assert.match(markup, /data-media-preview-frame="card"/);
assert.match(markup, /object-cover/);
assert.match(markup, /lg:grid-cols-3/);
assert.doesNotMatch(markup, /xl:grid-cols-4/);
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
assert.match(markup, /aria-label="Delete Output file-needs-review"/);
assert.doesNotMatch(markup, /clone-output\.mp4/);
assert.doesNotMatch(markup, /Match the source energy/);
assert.doesNotMatch(markup, /Approved creator still/);
assert.match(approvedMarkup, /Showing 1 of 8 outputs in approved output/);
assert.match(approvedMarkup, /\/api\/files\/file-approved/);
assert.doesNotMatch(approvedMarkup, /\/api\/files\/file-needs-review/);
assert.match(approvedMarkup, /pf-review-stamp !top-2 !bottom-auto/);
assert.match(approvedMarkup, /pf-review-stamp--approved/);
assert.match(approvedMarkup, /bg-\[var\(--pf-success\)\]/);

assert.match(emptyMarkup, /data-workspace-state="empty"/);
assert.match(emptyMarkup, /No Outputs ready for review/);
assert.match(emptyMarkup, /Start Clone/);
assert.match(emptyMarkup, /Open Generate/);

assert.match(errorMarkup, /data-workspace-state="error"/);
assert.match(errorMarkup, /Gallery failed to load/);
assert.match(errorMarkup, /Failed to load gallery/);
assert.match(errorMarkup, /Retry Gallery/);
assert.equal(/\s/.test(longFailureToken), false);
assert.match(longErrorMarkup, new RegExp(longFailureToken));
assert.match(longErrorMarkup, /min-w-0/);
assert.match(longErrorMarkup, /\[overflow-wrap:anywhere\]/);

assert.match(inspectorMarkup, /data-gallery-selection-inspector/);
assert.match(inspectorMarkup, /Selected asset preview/);
assert.match(inspectorMarkup, /Previewing asset/);
assert.match(inspectorMarkup, /Open selected asset preview/);
assert.match(inspectorMarkup, /Deselect previewed asset/);
assert.match(inspectorMarkup, /clone-output\.mp4/);
assert.match(inspectorMarkup, /1080 × 1920/);
assert.doesNotMatch(inspectorMarkup, /Use in Clone/);

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

assert.deepEqual(componentPropNames(gridSource, "GalleryGrid"), ["session"]);
assert.deepEqual(
  componentPropNames(inspectorSource, "GallerySelectionInspector"),
  ["selection", "children"]
);
assert.match(gridSource, /export type GalleryGridSession/);
assert.match(inspectorSource, /export type GallerySelection/);
assert.match(pageSource, /<GalleryGrid session=\{gridSession\} \/>/);
assert.doesNotMatch(gridSource, /createContext|useContext/);
assert.doesNotMatch(inspectorSource, /createContext|useContext/);
assert.doesNotMatch(pageSource, /createContext|useContext/);
