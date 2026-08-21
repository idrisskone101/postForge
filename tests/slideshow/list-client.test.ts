import assert from "node:assert/strict";

import { fetchSlideshowProjects } from "../../src/lib/slideshow/client";
import {
  fetchAllSlideshowProjectPages,
  fetchSlideshowProjectPage,
  parseSlideshowProjectListItem,
  SLIDESHOW_LIST_PAGE_SIZE,
} from "../../src/lib/slideshow/list-client";

const originalFetch = globalThis.fetch;

function listItemPayload(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    title: `Draft ${id}`,
    status: "draft",
    revision: 1,
    aspectRatio: "9:16",
    slideCount: 4,
    previewImageUrls: ["/api/files/preview-a"],
    successfulExportCount: 0,
    lastExportedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    slides: [{ id: "must-not-parse", headline: "secret" }],
    ...extra,
  };
}

async function run() {
  const parsed = parseSlideshowProjectListItem(
    listItemPayload("parsed-1"),
  );
  assert.equal(parsed.id, "parsed-1");
  assert.equal(parsed.slideCount, 4);
  assert.deepEqual(parsed.previewImageUrls, ["/api/files/preview-a"]);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, "slides"), false);

  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return new Response(
      JSON.stringify({
        projects: [listItemPayload("page-1")],
        total: 250,
        limit: SLIDESHOW_LIST_PAGE_SIZE,
        offset: 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const page = await fetchSlideshowProjectPage();
    assert.equal(urls.length, 1);
    assert.match(urls[0], /limit=20/);
    assert.match(urls[0], /offset=0/);
    assert.equal(page.total, 250);
    assert.equal(page.projects.length, 1);
    assert.equal(page.projects[0]?.slideCount, 4);
    assert.equal(
      Object.prototype.hasOwnProperty.call(page.projects[0], "slides"),
      false,
    );

    urls.length = 0;
    const items = await fetchSlideshowProjects("/api/slideshows");
    assert.equal(urls.length, 1);
    assert.match(urls[0], /limit=20/);
    assert.doesNotMatch(urls[0], /offset=20/);
    assert.doesNotMatch(urls[0], /offset=100/);
    assert.equal(items.length, 1);

    urls.length = 0;
    let drainCalls = 0;
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      const offset = Number(new URL(String(input), "http://local").searchParams.get("offset"));
      drainCalls += 1;
      const remaining = Math.max(0, 150 - offset);
      const count = Math.min(100, remaining);
      return new Response(
        JSON.stringify({
          projects: Array.from({ length: count }, (_, index) =>
            listItemPayload(`drain-${offset + index}`),
          ),
          total: 150,
          limit: 100,
          offset,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const drained = await fetchAllSlideshowProjectPages("/api/slideshows");
    assert.equal(drainCalls, 2);
    assert.equal(drained.length, 150);
    assert.match(urls[0], /limit=100/);
    assert.match(urls[1] ?? "", /offset=100/);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void run()
  .then(() => {
    console.log("slideshow list client tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
