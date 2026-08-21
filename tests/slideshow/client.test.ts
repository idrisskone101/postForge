import assert from "node:assert/strict";

import { createBlankSlideshowProject } from "../../src/components/slideshow/fixtures";
import type {
  SlideshowAutomation,
  SlideshowProject,
  SlideshowSlide,
} from "../../src/components/slideshow/types";
import {
  SlideshowApiError,
  createSlideshowAutomation,
  deleteSlideshowAutomation,
  deserializeSlideshowProject,
  downloadSlideshowExport,
  fetchSlideshowAutomations,
  fetchSlideshowProject,
  persistSlideshowProject,
  requestSlideshowCopyVariation,
  requestSlideshowCreatorDerive,
  requestSlideshowCreatorVisuals,
  requestSlideshowImageGeneration,
  requestSlideshowStory,
  serializeSlideshowProject,
  updateSlideshowAutomationStatus,
  waitForCreatorVisuals,
} from "../../src/lib/slideshow/client";

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

type FetchCall = { url: string; init?: RequestInit };

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function savedProjectPayload(project: SlideshowProject, id = "project-1") {
  return {
    id,
    revision: project.revision ?? 1,
    updatedAt: project.updatedAt,
    ...serializeSlideshowProject({ ...project, id }),
  };
}

function savedSlide(project: SlideshowProject, index = 0): SlideshowSlide {
  return { ...project.slides[index]!, id: `slide-${index + 1}` };
}

function sampleAutomation(overrides: Partial<SlideshowAutomation> = {}): SlideshowAutomation {
  return {
    id: "automation-1",
    name: "Weekday cadence",
    cadence: "Mon · 09:00",
    status: "paused",
    revision: 3,
    nextRunAt: null,
    projectId: "project-1",
    hooks: ["Hook A"],
    weekdays: ["Mon"],
    time: "09:00",
    timezone: "America/Toronto",
    visualPolicy: "reuse",
    imageCollectionId: "collection-1",
    imageModel: "nano-banana-2",
    ...overrides,
  };
}

async function withFetch(
  handler: (calls: FetchCall[], input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response,
  run: (calls: FetchCall[]) => Promise<void>,
) {
  const calls: FetchCall[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return handler(calls, input, init);
  };
  try {
    await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function main() {
  const error = new SlideshowApiError("Wait for the draft", 409, "draft_pending");
  assert.equal(error.name, "SlideshowApiError");
  assert.equal(error.message, "Wait for the draft");
  assert.equal(error.status, 409);
  assert.equal(error.code, "draft_pending");

  const blank = createBlankSlideshowProject();
  assert.match(blank.id, /^local-/);

  await withFetch(
    async () => jsonResponse({ error: "not here", code: "missing" }, 404),
    async () => {
      await assert.rejects(
        () => fetchSlideshowProject("project-1", "/slideshow-api"),
        (caught: unknown) => {
          assert.ok(caught instanceof SlideshowApiError);
          assert.equal(caught.message, "not here");
          assert.equal(caught.status, 404);
          assert.equal(caught.code, "missing");
          return true;
        },
      );
    },
  );

  await assert.rejects(
    () => fetchSlideshowProject(blank.id, "/slideshow-api"),
    (caught: unknown) => {
      assert.ok(caught instanceof SlideshowApiError);
      assert.equal(caught.status, 409);
      assert.match(caught.message, /finish saving before fetching/);
      return true;
    },
  );

  await withFetch(
    async (_calls, input) => {
      assert.equal(String(input), "/slideshow-api/project-1");
      return jsonResponse({
        project: savedProjectPayload(blank, "project-1"),
      });
    },
    async () => {
      const loaded = await fetchSlideshowProject("project-1", "/slideshow-api");
      assert.equal(loaded.id, "project-1");
      assert.equal(loaded.title, blank.title);
      assert.equal(loaded.slides.length, blank.slides.length);
    },
  );

  await withFetch(
    async (calls) => {
      const body = JSON.parse(String(calls[0]?.init?.body));
      assert.equal(Object.prototype.hasOwnProperty.call(body, "revision"), false);
      return jsonResponse({
        project: savedProjectPayload(blank, "created-1"),
      });
    },
    async (calls) => {
      const saved = await persistSlideshowProject(blank, "/slideshow-api");
      assert.equal(calls[0]?.url, "/slideshow-api");
      assert.equal(calls[0]?.init?.method, "POST");
      assert.equal(saved.id, "created-1");
    },
  );

  const persisted = deserializeSlideshowProject(
    savedProjectPayload({ ...blank, id: "project-1", revision: 4 }, "project-1"),
  );
  await withFetch(
    async (calls) => {
      const body = JSON.parse(String(calls[0]?.init?.body));
      assert.equal(body.revision, 4);
      return jsonResponse({
        project: { ...savedProjectPayload(persisted, "project-1"), revision: 5 },
      });
    },
    async (calls) => {
      const saved = await persistSlideshowProject(persisted, "/slideshow-api");
      assert.equal(calls[0]?.url, "/slideshow-api/project-1");
      assert.equal(calls[0]?.init?.method, "PATCH");
      assert.equal(saved.revision, 5);
    },
  );

  await withFetch(
    async () =>
      jsonResponse({
        story: {
          slides: [
            {
              content: {
                eyebrow: "NEW EYEBROW",
                headline: "New headline",
                body: "New body",
              },
              imagePrompt: "A quiet desk at dawn",
            },
          ],
        },
      }),
    async (calls) => {
      const variation = await requestSlideshowCopyVariation(
        blank,
        blank.slides[0]!,
        "/slideshow-api",
      );
      assert.equal(calls[0]?.url, "/slideshow-api/generate-story");
      assert.equal(calls[0]?.init?.method, "POST");
      const body = JSON.parse(String(calls[0]?.init?.body));
      assert.equal(body.slideCount, 1);
      assert.equal(body.language, blank.language);
      assert.equal(variation.eyebrow, "NEW EYEBROW");
      assert.equal(variation.headline, "New headline");
      assert.equal(variation.body, "New body");
      assert.match(String(variation.prompt), /quiet desk at dawn/i);
    },
  );

  await withFetch(
    async () =>
      jsonResponse({
        story: {
          title: "Built from the idea",
          caption: "Save this",
          slides: [
            {
              kind: "hook",
              content: { eyebrow: "START", headline: "Hook", body: "Open" },
              imagePrompt: "hook prompt",
            },
            {
              role: "body",
              content: { headline: "Point", body: "Detail" },
              imagePrompt: "body prompt",
            },
            {
              kind: "cta",
              content: { headline: "Do this", body: "Next" },
              imagePrompt: "cta prompt",
            },
          ],
        },
        provider: "ollama",
        model: "gemma4",
        warning: "slow",
      }),
    async (calls) => {
      const story = await requestSlideshowStory(
        {
          idea: "calmer mornings",
          slideCount: 3,
          language: "English",
          includeCta: true,
        },
        "/slideshow-api",
      );
      const body = JSON.parse(String(calls[0]?.init?.body));
      assert.equal(body.idea, "calmer mornings");
      assert.equal(body.slideCount, 3);
      assert.match(story.id, /^local-/);
      assert.equal(story.title, "Built from the idea");
      assert.equal(story.caption, "Save this");
      assert.equal(story.generationProvider, "ollama");
      assert.equal(story.generationModel, "gemma4");
      assert.equal(story.generationWarning, "slow");
      assert.equal(story.includeCta, true);
      assert.equal(story.slides[0]?.kind, "hook");
      assert.equal(story.slides[1]?.kind, "content");
      assert.equal(story.slides[2]?.kind, "cta");
      assert.equal(story.slides[0]?.visualKey, "coral-glow");
      assert.equal(story.slides[1]?.visualKey, "blue-studio");
    },
  );

  await withFetch(
    async () => jsonResponse({ story: { slides: [] } }),
    async () => {
      await assert.rejects(
        () =>
          requestSlideshowStory(
            {
              idea: "empty",
              slideCount: 1,
              language: "English",
              includeCta: false,
            },
            "/slideshow-api",
          ),
        (caught: unknown) => {
          assert.ok(caught instanceof SlideshowApiError);
          assert.equal(caught.status, 500);
          assert.match(caught.message, /no slides/);
          return true;
        },
      );
    },
  );

  const imageProject = { ...blank, id: "project-1", revision: 6 };
  const imageSlide = savedSlide(imageProject);
  await assert.rejects(
    () => requestSlideshowImageGeneration(blank, blank.slides[0]!, "/slideshow-api"),
    (caught: unknown) => {
      assert.ok(caught instanceof SlideshowApiError);
      assert.equal(caught.status, 409);
      return true;
    },
  );

  await withFetch(
    async (calls) => {
      if (calls.length === 1) {
        return jsonResponse({
          jobId: "job-1",
          statusUrl: "/api/jobs/job-1",
          projectRevision: 7,
        });
      }
      return jsonResponse({
        status: "completed",
        outputs: [{ id: "file-9", url: "/api/files/file-9" }],
        slideshow: { projectRevision: 8, imageUrl: "/api/files/file-9", generatedFileId: "file-9" },
      });
    },
    async (calls) => {
      let queuedRevision = 0;
      const result = await requestSlideshowImageGeneration(
        imageProject,
        imageSlide,
        "/slideshow-api",
        (revision) => {
          queuedRevision = revision;
        },
        "nano-banana-2",
      );
      assert.equal(calls[0]?.url, "/slideshow-api/project-1/slides/slide-1/generate-image");
      const body = JSON.parse(String(calls[0]?.init?.body));
      assert.equal(body.revision, 6);
      assert.equal(body.model, "nano-banana-2");
      assert.equal(queuedRevision, 7);
      assert.equal(result.imageUrl, "/api/files/file-9");
      assert.equal(result.generatedFileId, "file-9");
      assert.equal(result.projectRevision, 8);
    },
  );

  await withFetch(
    async () =>
      jsonResponse({
        template: { aesthetic: { core_vibe: "quiet" } },
        model: "gemma4",
        referenceCount: 2,
        error: "",
      }),
    async (calls) => {
      const derived = await requestSlideshowCreatorDerive("/slideshow-api", {
        collectionAssetIds: ["asset-1"],
        referenceImageUrls: ["https://cdn.example.com/a.jpg"],
        idempotencyKey: "key-1",
      });
      assert.equal(calls[0]?.url, "/slideshow-api/creator/derive");
      assert.equal(calls[0]?.init?.method, "POST");
      assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
        collectionAssetIds: ["asset-1"],
        referenceImageUrls: ["https://cdn.example.com/a.jpg"],
        idempotencyKey: "key-1",
      });
      assert.deepEqual(derived.template, { aesthetic: { core_vibe: "quiet" } });
      assert.equal(derived.model, "gemma4");
      assert.equal(derived.referenceCount, 2);
    },
  );

  await assert.rejects(
    () => requestSlideshowCreatorVisuals(blank, [], {}, "/slideshow-api"),
    (caught: unknown) => {
      assert.ok(caught instanceof SlideshowApiError);
      assert.equal(caught.status, 409);
      return true;
    },
  );

  await withFetch(
    async () =>
      jsonResponse({
        jobs: [{ jobId: "job-a" }],
        model: "gpt-image-2",
        estimatedCost: 0.12,
        projectRevision: 9,
      }),
    async (calls) => {
      const visuals = await requestSlideshowCreatorVisuals(
        imageProject,
        [{ slideId: "slide-1", text: "Show up" }],
        { aesthetic: { core_vibe: "quiet" } },
        "/slideshow-api",
      );
      assert.equal(calls[0]?.url, "/slideshow-api/project-1/generate-visuals");
      const body = JSON.parse(String(calls[0]?.init?.body));
      assert.equal(body.aspectRatio, "9:16");
      assert.equal(body.model, "gpt-image-2");
      assert.equal(visuals.jobs.length, 1);
      assert.equal(visuals.projectRevision, 9);
      assert.equal(visuals.estimatedCost, 0.12);
    },
  );

  await withFetch(
    async () =>
      jsonResponse({
        status: "completed",
      }),
    async (calls) => {
      const settled = await waitForCreatorVisuals([{ jobId: "job-a" }]);
      assert.equal(calls[0]?.url, "/api/jobs/job-a");
      assert.equal(settled.completed, 1);
      assert.deepEqual(settled.failed, []);
    },
  );

  await withFetch(
    async () => jsonResponse({ status: "failed", error: "provider down" }),
    async () => {
      const settled = await waitForCreatorVisuals([{ jobId: "job-b" }]);
      assert.equal(settled.completed, 0);
      assert.deepEqual(settled.failed, [{ jobId: "job-b", error: "provider down" }]);
    },
  );

  const downloads: string[] = [];
  globalThis.window = {
    setTimeout: ((fn: (...args: unknown[]) => void) => {
      fn();
      return 0;
    }) as typeof setTimeout,
  } as unknown as Window & typeof globalThis;
  globalThis.document = {
    createElement: () => {
      const anchor = {
        href: "",
        download: "",
        click() {
          downloads.push(anchor.download);
        },
        remove() {},
      };
      return anchor;
    },
    body: { append() {} },
  } as unknown as Document;
  URL.createObjectURL = () => "blob:export";
  URL.revokeObjectURL = () => {};

  try {
    await assert.rejects(
      () => downloadSlideshowExport(blank, "/slideshow-api"),
      (caught: unknown) => {
        assert.ok(caught instanceof SlideshowApiError);
        assert.equal(caught.status, 409);
        return true;
      },
    );

    await withFetch(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            "content-disposition": 'attachment; filename="morning-slides.zip"',
            "x-postforge-exported-at": "2026-08-21T00:00:00.000Z",
            "x-postforge-export-count": "4",
          },
        }),
      async (calls) => {
        const receipt = await downloadSlideshowExport(
          { ...blank, id: "project-1", title: "Morning slides", caption: "hello" },
          "/slideshow-api",
          "photo-carousel",
          "hello",
        );
        assert.equal(calls[0]?.url, "/slideshow-api/project-1/export");
        const body = JSON.parse(String(calls[0]?.init?.body));
        assert.equal(body.type, "carousel");
        assert.equal(body.secondsPerSlide, 2.5);
        assert.equal(receipt?.successfulExportCount, 4);
        assert.equal(receipt?.exportedAt, "2026-08-21T00:00:00.000Z");
        assert.equal(downloads[0], "morning-slides.zip");
      },
    );
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  }

  await withFetch(
    async (_calls, input) => {
      const url = new URL(String(input), "http://local");
      const offset = Number(url.searchParams.get("offset"));
      const remaining = Math.max(0, 150 - offset);
      const count = Math.min(100, remaining);
      return jsonResponse({
        automations: Array.from({ length: count }, (_, index) => ({
          id: `automation-${offset + index}`,
          name: `Auto ${offset + index}`,
          status: "active",
          revision: 1,
          schedule: { cadence: "Custom schedule" },
          contentSettings: { visualPolicy: "reuse" },
        })),
        total: 150,
      });
    },
    async (calls) => {
      const items = await fetchSlideshowAutomations("/slideshow-api");
      assert.equal(items.length, 150);
      assert.match(calls[0]?.url ?? "", /\/slideshow-api\/automations\?limit=100&offset=0/);
      assert.match(calls[1]?.url ?? "", /offset=100/);
      assert.equal(items[0]?.status, "active");
      assert.equal(items[0]?.visualPolicy, "reuse");
    },
  );

  await withFetch(
    async () =>
      jsonResponse({
        id: "automation-9",
        name: "Created",
        status: "paused",
        revision: 1,
        projectId: "project-1",
        schedule: {
          cadence: "Mon · 09:00",
          weekdays: ["Mon"],
          time: "09:00",
          timezone: "America/Toronto",
        },
        contentSettings: {
          hooks: ["Hook A"],
          visualPolicy: "reuse",
          imageCollectionId: "collection-1",
          imageModel: "nano-banana-2",
        },
      }),
    async (calls) => {
      const created = await createSlideshowAutomation(
        sampleAutomation({ id: "local-new", projectId: "local-draft" }),
        "/slideshow-api",
      );
      assert.equal(calls[0]?.url, "/slideshow-api/automations");
      assert.equal(calls[0]?.init?.method, "POST");
      const body = JSON.parse(String(calls[0]?.init?.body));
      assert.equal(body.projectId, null);
      assert.equal(body.publishSettings.mode, "draft");
      assert.equal(created.id, "automation-9");
      assert.deepEqual(created.weekdays, ["Mon"]);
    },
  );

  const localAutomation = sampleAutomation({ id: "local-1", status: "paused" });
  const skippedStatus = await updateSlideshowAutomationStatus(
    localAutomation,
    "active",
    "/slideshow-api",
  );
  assert.equal(skippedStatus.status, "active");
  await deleteSlideshowAutomation(localAutomation, "/slideshow-api");

  await withFetch(
    async () =>
      jsonResponse({
        id: "automation-1",
        name: "Weekday cadence",
        status: "active",
        revision: 4,
        schedule: { cadence: "Mon · 09:00" },
        contentSettings: { visualPolicy: "reuse" },
      }),
    async (calls) => {
      const updated = await updateSlideshowAutomationStatus(
        sampleAutomation(),
        "active",
        "/slideshow-api",
      );
      assert.equal(calls[0]?.init?.method, "PATCH");
      assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
        revision: 3,
        status: "active",
      });
      assert.equal(updated.status, "active");
      assert.equal(updated.revision, 4);
    },
  );

  console.log("slideshow client tests passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
