import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  deriveSlideshowAnalytics,
  fetchSlideshowAutomations,
  fetchSlideshowProjects,
} from "../src/components/slideshow/api";
import {
  createBlankSlideshowProject,
  DEFAULT_SLIDESHOW_INSPIRATION,
  DEFAULT_SLIDESHOW_TEMPLATES,
} from "../src/components/slideshow/fixtures";
import {
  AnalyticsView,
  InspirationView,
} from "../src/components/slideshow/studio-views";
import type {
  SlideshowAutomation,
  SlideshowProject,
} from "../src/components/slideshow/types";

const base = createBlankSlideshowProject();
const project = (input: Partial<SlideshowProject>): SlideshowProject => ({
  ...base,
  id: input.id ?? base.id,
  ...input,
});

const projects: SlideshowProject[] = [
  project({
    id: "draft-1",
    status: "draft",
    createdAt: "2026-08-03T18:00:00.000Z",
    successfulExportCount: 3,
    exportHistory: [
      "2026-08-02T18:00:00.000Z",
      "2026-08-03T18:00:00.000Z",
    ],
  }),
  project({
    id: "ready-1",
    status: "ready",
    createdAt: "2026-06-01T18:00:00.000Z",
    successfulExportCount: 1,
    exportHistory: ["2026-06-02T18:00:00.000Z"],
  }),
];

const automations: SlideshowAutomation[] = [
  {
    id: "active-1",
    name: "Active schedule",
    cadence: "Daily",
    status: "active",
    successfulRunCount: 5,
    lastRunAt: "2026-08-03T18:00:00.000Z",
    runHistory: [
      "2026-08-02T18:00:00.000Z",
      "2026-08-03T18:00:00.000Z",
    ],
  },
  {
    id: "legacy-1",
    name: "Pre-metadata schedule",
    cadence: "Weekly",
    status: "paused",
    lastRunAt: "2026-08-01T18:00:00.000Z",
  },
];

const analytics = deriveSlideshowAnalytics(
  projects,
  automations,
  new Date("2026-08-03T18:00:00.000Z"),
);

assert.equal(analytics.draftProjects, 1);
assert.equal(analytics.successfulExports, 4);
assert.equal(analytics.activeAutomations, 1);
assert.equal(analytics.successfulAutomationRuns, 6);
assert.equal(analytics.dailyActivity.length, 30);
assert.deepEqual(analytics.dailyActivity.slice(-3), [1, 2, 3]);
assert.equal(
  analytics.dailyActivity.reduce((total, value) => total + value, 0),
  6,
);

const empty = deriveSlideshowAnalytics([], [], new Date("2026-08-03T18:00:00.000Z"));
assert.equal(empty.dailyActivity.length, 30);
assert.equal(empty.dailyActivity.every((value) => value === 0), true);

const analyticsMarkup = renderToStaticMarkup(
  createElement(AnalyticsView, { analytics, tiktokConnected: false }),
);
assert.match(analyticsMarkup, /PostForge activity/);
assert.match(analyticsMarkup, /Successful exports/);
assert.match(analyticsMarkup, /does not estimate social performance/);
assert.match(analyticsMarkup, /approved account connection/);
assert.doesNotMatch(analyticsMarkup, /Total views|High-intent interactions/);

const inspirationMarkup = renderToStaticMarkup(
  createElement(InspirationView, {
    inspiration: DEFAULT_SLIDESHOW_INSPIRATION,
    templates: DEFAULT_SLIDESHOW_TEMPLATES,
    onUse: () => undefined,
  }),
);
assert.match(inspirationMarkup, /PostForge format examples/);
assert.match(inspirationMarkup, /not live ranked social posts/);
assert.doesNotMatch(inspirationMarkup, /142,?000|118,?000|96,?000/);

async function assertExhaustiveAnalyticsPagination() {
  const originalFetch = globalThis.fetch;
  const projectRecords = Array.from({ length: 135 }, (_, index) => ({
    id: `project-${index + 1}`,
    title: `Project ${index + 1}`,
    status: "draft",
    revision: 0,
    settings: {},
    layout: {},
    slides: [],
    createdAt: "2026-08-03T18:00:00.000Z",
    updatedAt: "2026-08-03T18:00:00.000Z",
  }));
  const automationRecords = Array.from({ length: 135 }, (_, index) => ({
    id: `automation-${index + 1}`,
    name: `Automation ${index + 1}`,
    cadence: "Daily",
    status: "paused",
    revision: 0,
    schedule: {},
    contentSettings: {},
  }));
  const requestedOffsets = {
    projects: [] as number[],
    automations: [] as number[],
  };

  globalThis.fetch = (async (input, init) => {
    assert.equal(init?.cache, "no-store");
    const inputUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(inputUrl, "https://postforge.test");
    const limit = Number(url.searchParams.get("limit"));
    const offset = Number(url.searchParams.get("offset"));
    assert.equal(limit, 100);

    const isAutomationRequest = url.pathname.endsWith("/automations");
    const key = isAutomationRequest ? "automations" : "projects";
    const records = isAutomationRequest ? automationRecords : projectRecords;
    requestedOffsets[key].push(offset);

    return Response.json({
      [key]: records.slice(offset, offset + limit),
      total: records.length,
      limit,
      offset,
    });
  }) as typeof fetch;

  try {
    const fetchedProjects = await fetchSlideshowProjects("/api/slideshows");
    const fetchedAutomations = await fetchSlideshowAutomations("/api/slideshows");

    assert.deepEqual(requestedOffsets.projects, [0, 100]);
    assert.deepEqual(requestedOffsets.automations, [0, 100]);
    assert.equal(fetchedProjects.length, 135);
    assert.equal(fetchedAutomations.length, 135);
    assert.equal(new Set(fetchedProjects.map((item) => item.id)).size, 135);
    assert.equal(new Set(fetchedAutomations.map((item) => item.id)).size, 135);
    assert.deepEqual(
      fetchedProjects.map((item) => item.id),
      projectRecords.map((item) => item.id),
    );
    assert.deepEqual(
      fetchedAutomations.map((item) => item.id),
      automationRecords.map((item) => item.id),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

assertExhaustiveAnalyticsPagination()
  .then(() => console.log("slideshow analytics tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
