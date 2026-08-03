import assert from "node:assert/strict";

import {
  deleteSlideshowAutomation,
  deleteSlideshowCollection,
  renameSlideshowCollection,
  updateSlideshowAutomation,
} from "../src/components/slideshow/api";
import type {
  SlideshowAutomation,
  SlideshowCollection,
} from "../src/components/slideshow/types";

const originalFetch = globalThis.fetch;
const requests: Array<{ url: string; init?: RequestInit }> = [];
const responses = [
  new Response(
    JSON.stringify({
      id: "automation-1",
      name: "Edited cadence",
      status: "active",
      revision: 8,
      nextRunAt: "2026-08-05T13:30:00.000Z",
      projectId: "project-1",
      schedule: {
        cadence: "Tue, Thu · 09:30",
        weekdays: ["Tue", "Thu"],
        time: "09:30",
        timezone: "America/Toronto",
      },
      contentSettings: {
        hooks: ["New hook"],
        visualPolicy: "fresh-ai",
        imageModel: "nano-banana-2",
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  ),
  new Response(null, { status: 204 }),
  new Response(
    JSON.stringify({
      id: "collection-1",
      title: "Renamed visuals",
      revision: 4,
      images: [],
      settings: {},
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  ),
  new Response(null, { status: 204 }),
];

async function main() {
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    const response = responses.shift();
    assert.ok(response, "unexpected fetch call");
    return response;
  };

  try {
  const automation: SlideshowAutomation = {
    id: "automation-1",
    name: "Edited cadence",
    cadence: "Tue, Thu · 09:30",
    status: "active",
    revision: 7,
    nextRunAt: null,
    projectId: "project-1",
    hooks: ["New hook"],
    weekdays: ["Tue", "Thu"],
    time: "09:30",
    timezone: "America/Toronto",
    visualPolicy: "fresh-ai",
    imageModel: "nano-banana-2",
  };

  const updated = await updateSlideshowAutomation(automation, "/slideshow-api");
  assert.equal(updated.revision, 8);
  assert.deepEqual(updated.weekdays, ["Tue", "Thu"]);
  assert.equal(updated.timezone, "America/Toronto");
  assert.equal(updated.visualPolicy, "fresh-ai");

  const updateRequest = requests[0];
  assert.equal(updateRequest.url, "/slideshow-api/automations/automation-1");
  assert.equal(updateRequest.init?.method, "PATCH");
  const updateBody = JSON.parse(String(updateRequest.init?.body));
  assert.equal(updateBody.revision, 7);
  assert.deepEqual(updateBody.schedule.weekdays, ["Tue", "Thu"]);
  assert.equal(updateBody.schedule.time, "09:30");
  assert.equal(updateBody.schedule.timezone, "America/Toronto");
  assert.equal(updateBody.contentSettings.visualPolicy, "fresh-ai");

  await deleteSlideshowAutomation(updated, "/slideshow-api");
  const automationDelete = requests[1];
  assert.equal(automationDelete.init?.method, "DELETE");
  assert.deepEqual(JSON.parse(String(automationDelete.init?.body)), {
    revision: 8,
  });

  const collection: SlideshowCollection = {
    id: "collection-1",
    name: "Old visuals",
    imageCount: 0,
    visualKeys: [],
    revision: 3,
  };
  const renamed = await renameSlideshowCollection(
    collection,
    "  Renamed visuals  ",
    "/slideshow-api",
  );
  assert.equal(renamed.name, "Renamed visuals");
  assert.equal(renamed.revision, 4);
  const renameRequest = requests[2];
  assert.equal(renameRequest.init?.method, "PATCH");
  assert.deepEqual(JSON.parse(String(renameRequest.init?.body)), {
    revision: 3,
    name: "Renamed visuals",
  });

  await deleteSlideshowCollection(renamed, "/slideshow-api");
  const collectionDelete = requests[3];
  assert.equal(collectionDelete.init?.method, "DELETE");
  assert.deepEqual(JSON.parse(String(collectionDelete.init?.body)), {
    revision: 4,
  });
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log("slideshow management tests passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
