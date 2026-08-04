import assert from "node:assert/strict";

import {
  nextSlideshowAutomationRun,
  parseSlideshowAutomationSchedule,
} from "../src/lib/slideshow/automation-schedule";
import {
  copySlideshowAutomationSourceContent,
  launchSlideshowAutomationFreshVisuals,
  queueSlideshowAutomationFreshVisuals,
  selectSlideshowAutomationHook,
  stripSlideshowClientId,
  stripSlideshowProjectActivity,
  type SlideshowAutomationFreshVisualDependencies,
} from "../src/lib/slideshow/automation-worker";
import {
  readSlideshowAutomationVisualSettings,
  shouldGenerateFreshAutomationVisuals,
} from "../src/lib/slideshow/automation-visuals";

const weekdays = {
  weekdays: ["Mon", "Wed", "Fri"],
  time: "09:00",
  timezone: "America/Toronto",
};

assert.deepEqual(parseSlideshowAutomationSchedule(weekdays), {
  weekdays: [1, 3, 5],
  time: "09:00",
  timezone: "America/Toronto",
});

assert.deepEqual(
  parseSlideshowAutomationSchedule({
    cadence: "Mon, Wed, Fri · 09:00",
    timezone: "America/Toronto",
  }),
  {
    weekdays: [1, 3, 5],
    time: "09:00",
    timezone: "America/Toronto",
  },
);

// Before the local wall time, the current selected weekday is still eligible.
assert.equal(
  nextSlideshowAutomationRun(
    weekdays,
    new Date("2026-08-03T12:59:59.000Z"), // Monday 08:59:59 EDT
  ).toISOString(),
  "2026-08-03T13:00:00.000Z",
);

// Once Monday's slot has passed, the next selected weekday is Wednesday.
assert.equal(
  nextSlideshowAutomationRun(
    weekdays,
    new Date("2026-08-03T13:00:00.000Z"),
  ).toISOString(),
  "2026-08-05T13:00:00.000Z",
);

// IANA zones with non-hour offsets retain the requested local minute too.
assert.equal(
  nextSlideshowAutomationRun(
    { weekdays: ["Mon"], time: "09:00", timezone: "Asia/Kolkata" },
    new Date("2026-08-03T03:00:00.000Z"), // Monday 08:30 IST
  ).toISOString(),
  "2026-08-03T03:30:00.000Z",
);

// The same 09:00 wall time moves from UTC-5 to UTC-4 after spring DST.
assert.equal(
  nextSlideshowAutomationRun(
    { weekdays: ["Sun"], time: "09:00", timezone: "America/Toronto" },
    new Date("2026-03-07T15:00:00.000Z"),
  ).toISOString(),
  "2026-03-08T13:00:00.000Z",
);

// The same 09:00 wall time moves from UTC-4 to UTC-5 after fall DST.
assert.equal(
  nextSlideshowAutomationRun(
    { weekdays: ["Sun"], time: "09:00", timezone: "America/Toronto" },
    new Date("2026-10-31T14:00:00.000Z"),
  ).toISOString(),
  "2026-11-01T14:00:00.000Z",
);

// A nonexistent spring-forward time uses compatible disambiguation (02:30 -> 03:30).
assert.equal(
  nextSlideshowAutomationRun(
    { weekdays: ["Sun"], time: "02:30", timezone: "America/Toronto" },
    new Date("2026-03-08T04:00:00.000Z"),
  ).toISOString(),
  "2026-03-08T07:30:00.000Z",
);

const fallOverlap = {
  weekdays: ["Sun"],
  time: "01:30",
  timezone: "America/Toronto",
};

// Both fall-back 01:30 instants are valid; choose the first one still in the future.
assert.equal(
  nextSlideshowAutomationRun(
    fallOverlap,
    new Date("2026-11-01T04:00:00.000Z"),
  ).toISOString(),
  "2026-11-01T05:30:00.000Z",
);
assert.equal(
  nextSlideshowAutomationRun(
    fallOverlap,
    new Date("2026-11-01T05:45:00.000Z"),
  ).toISOString(),
  "2026-11-01T06:30:00.000Z",
);

assert.throws(
  () =>
    parseSlideshowAutomationSchedule({
      weekdays: ["Mon"],
      time: "09:00",
      timezone: "Mars/Olympus_Mons",
    }),
  /Invalid IANA timezone/,
);
assert.throws(
  () =>
    parseSlideshowAutomationSchedule({
      weekdays: [],
      time: "09:00",
      timezone: "UTC",
    }),
  /at least one weekday/,
);

const sourceSettings = {
  clientId: "local-project-correlation-id",
  aspectRatio: "9:16",
  nested: { preserved: true },
};
assert.deepEqual(stripSlideshowClientId(sourceSettings), {
  aspectRatio: "9:16",
  nested: { preserved: true },
});
assert.equal(sourceSettings.clientId, "local-project-correlation-id");
assert.deepEqual(
  stripSlideshowProjectActivity({
    ...sourceSettings,
    successfulExportCount: 12,
    lastExportedAt: "2026-08-03T10:00:00.000Z",
    lastExportFormat: "photo-carousel",
    exportHistory: ["2026-08-03T10:00:00.000Z"],
  }),
  {
    aspectRatio: "9:16",
    nested: { preserved: true },
  },
);
assert.deepEqual(
  stripSlideshowClientId({
    clientId: "local-slide-correlation-id",
    headline: "Fresh server-owned copy",
  }),
  { headline: "Fresh server-owned copy" },
);
const sourceContentWithImages = {
  clientId: "local-slide",
  headline: "Source headline",
  imageUrls: ["/api/slideshows/image-collections/old/image"],
  visualKeys: ["old-visual"],
};
assert.deepEqual(
  copySlideshowAutomationSourceContent(sourceContentWithImages, true),
  {
    headline: "Source headline",
    imageUrls: ["/api/slideshows/image-collections/old/image"],
    visualKeys: ["old-visual"],
  },
);
assert.deepEqual(
  copySlideshowAutomationSourceContent(sourceContentWithImages, false),
  {
    headline: "Source headline",
    imageUrls: [],
    visualKeys: [],
  },
);
assert.deepEqual(sourceContentWithImages.imageUrls, [
  "/api/slideshows/image-collections/old/image",
]);

const hookPool = ["Hook one", "Hook two", "Hook three"];
let usedHooks: string[] = [];
let previousHook: string | undefined;
for (let run = 0; run < hookPool.length; run += 1) {
  const selection = selectSlideshowAutomationHook({
    automationId: "automation-test",
    scheduledFor: new Date(Date.UTC(2026, 7, 3 + run, 13)),
    hooks: hookPool,
    usedHooks,
    preventRepeats: true,
  });
  assert.ok(selection.selectedHook);
  assert.ok(!usedHooks.includes(selection.selectedHook));
  previousHook = selection.selectedHook;
  usedHooks = selection.nextUsedHooks ?? usedHooks;
}
assert.equal(new Set(usedHooks).size, hookPool.length);

const nextCycle = selectSlideshowAutomationHook({
  automationId: "automation-test",
  scheduledFor: new Date("2026-08-07T13:00:00.000Z"),
  hooks: hookPool,
  usedHooks,
  preventRepeats: true,
});
assert.ok(nextCycle.selectedHook);
assert.notEqual(nextCycle.selectedHook, previousHook);
assert.deepEqual(nextCycle.nextUsedHooks, [nextCycle.selectedHook]);

const repeatsAllowed = selectSlideshowAutomationHook({
  automationId: "automation-test",
  scheduledFor: new Date("2026-08-08T13:00:00.000Z"),
  hooks: hookPool,
  usedHooks,
  preventRepeats: false,
});
assert.equal(repeatsAllowed.nextUsedHooks, undefined);

async function testAutomationVisualPolicy() {
  assert.deepEqual(readSlideshowAutomationVisualSettings(undefined), {
    policy: "reuse",
    imageModel: "nano-banana-2",
  });
  assert.equal(shouldGenerateFreshAutomationVisuals({}), false);
  assert.equal(
    shouldGenerateFreshAutomationVisuals({ visualPolicy: "unexpected" }),
    false,
  );
  assert.equal(
    shouldGenerateFreshAutomationVisuals({ visualPolicy: "fresh-ai" }),
    true,
  );
  assert.deepEqual(
    readSlideshowAutomationVisualSettings({
      visualPolicy: "reuse",
      imageCollectionId: " collection-1 ",
    }),
    {
      policy: "reuse",
      imageCollectionId: "collection-1",
      imageModel: "nano-banana-2",
    },
  );

  const draft = {
    id: "draft-1",
    revision: 1,
    settings: { aspectRatio: "4:5" },
    slides: [
      { id: "slide-1", imagePrompt: "A bright editorial kitchen" },
      { id: "slide-2", imagePrompt: "A calm morning notebook" },
    ],
  };
  const reservations: Array<{
    slideId: string;
    revision: number;
    estimatedCost: number;
  }> = [];
  const submissions: string[] = [];
  const dependencies: SlideshowAutomationFreshVisualDependencies = {
    reserve: async (_projectId, slideId, revision, reservation) => {
      reservations.push({
        slideId,
        revision,
        estimatedCost: reservation.estimatedCost,
      });
      return {
        jobId: `job-${slideId}`,
        projectRevision: revision + 1,
      };
    },
    submit: async (jobId) => {
      submissions.push(jobId);
      return { submitted: true as const };
    },
  };

  // Reuse is the default and must never reserve or submit paid image jobs.
  await queueSlideshowAutomationFreshVisuals(draft, {}, dependencies);
  assert.deepEqual(reservations, []);
  assert.deepEqual(submissions, []);
  assert.equal(
    launchSlideshowAutomationFreshVisuals(
      draft,
      { visualPolicy: "reuse" },
      dependencies,
    ),
    false,
  );

  await queueSlideshowAutomationFreshVisuals(
    draft,
    { visualPolicy: "fresh-ai", imageModel: "nano-banana-2" },
    dependencies,
  );
  assert.deepEqual(reservations, [
    { slideId: "slide-1", revision: 1, estimatedCost: 0.08 },
    { slideId: "slide-2", revision: 2, estimatedCost: 0.08 },
  ]);
  assert.deepEqual(submissions.sort(), ["job-slide-1", "job-slide-2"]);

  // Automation transactions persist their image-job outbox up front. Those
  // linked jobs are submitted directly and must not reserve a second paid job.
  reservations.length = 0;
  submissions.length = 0;
  await queueSlideshowAutomationFreshVisuals(
    {
      ...draft,
      slides: draft.slides.map((slide) => ({
        ...slide,
        generationJobId: `outbox-${slide.id}`,
      })),
    },
    { visualPolicy: "fresh-ai", imageModel: "nano-banana-2" },
    dependencies,
  );
  assert.deepEqual(reservations, []);
  assert.deepEqual(submissions, ["outbox-slide-1", "outbox-slide-2"]);

  // Launching is intentionally detached: a slow provider task does not hold
  // the cadence tick open.
  let releaseReservation:
    | ((value: { jobId: string; projectRevision: number }) => void)
    | undefined;
  const waitingDependencies: SlideshowAutomationFreshVisualDependencies = {
    ...dependencies,
    reserve: async (_projectId, _slideId, revision) =>
      new Promise<{ jobId: string; projectRevision: number }>((resolve) => {
        releaseReservation = resolve;
      }).then((result) => ({
        jobId: result.jobId,
        projectRevision: revision + 1,
      })),
  };
  assert.equal(
    launchSlideshowAutomationFreshVisuals(
      { ...draft, slides: draft.slides.slice(0, 1) },
      { visualPolicy: "fresh-ai" },
      waitingDependencies,
    ),
    true,
  );
  assert.ok(releaseReservation);
  releaseReservation?.({ jobId: "detached-job", projectRevision: 2 });
  await new Promise((resolve) => setTimeout(resolve, 0));
}

testAutomationVisualPolicy()
  .then(() => console.log("slideshow automation schedule tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
