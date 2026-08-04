import assert from "node:assert/strict";
import {
  AutomationReviewValidationError,
  buildAutomationReviewDraftSpec,
  runAutomationReviewDraft,
} from "../src/lib/automation-review";
import {
  AUTOMATION_SOCIAL_DESTINATIONS,
  AUTOMATION_TEMPLATES,
  automationDestinationLabel,
  automationStatusAfterReview,
  composeAutomationHook,
  createAutomationRecord,
  createAutomationSchedulerState,
  integrationAccountLabel,
  isAutomationRecord,
  isAutomationSocialDestination,
  resolveAutomationDestination,
  type AutomationRecord,
} from "../src/lib/automations";
import {
  getDueAutomationScheduleSlot,
  runAutomationSchedulerTick,
  validateAutomationSchedule,
  type AutomationScheduleSlot,
  type AutomationSchedulerDependencies,
} from "../src/lib/automation-schedule";
import type {
  IntegrationProvider,
  PublicIntegrationStatus,
} from "../src/lib/integrations/types";
import { POST as updateAutomationSchedule } from "../src/app/api/automations/[id]/schedule/route";

assert.deepEqual(
  AUTOMATION_TEMPLATES.map((template) => template.id),
  [
    "story-lesson",
    "before-after",
    "product-breakdown",
    "quick-wins",
    "myth-reality",
    "custom",
  ]
);

assert.equal(
  new Set(AUTOMATION_TEMPLATES.map((template) => template.id)).size,
  AUTOMATION_TEMPLATES.length,
  "template ids must stay unique"
);

for (const template of AUTOMATION_TEMPLATES) {
  assert.ok(template.name.length > 0);
  assert.ok(template.category.length > 0);
  assert.ok(template.description.length > 0);
  assert.ok(template.hook.length > 0);
  assert.ok(template.structure.length > 0);
  assert.ok(template.cta.length > 0);
  assert.ok(template.slides >= 3 && template.slides <= 10);
}

const beforeAfterTemplate = AUTOMATION_TEMPLATES.find(
  (template) => template.id === "before-after"
)!;
const beforeAfter = createAutomationRecord("before-after");

assert.match(beforeAfter.id, /^automation_\d+_[a-z0-9]{1,6}$/);
assert.equal(beforeAfter.name, "Before / after loop");
assert.equal(beforeAfter.template, beforeAfterTemplate.id);
assert.equal(beforeAfter.status, "draft");
assert.equal(beforeAfter.destination, "manual");
assert.equal(beforeAfter.accountId, null);
assert.equal(beforeAfter.accountLabel, null);
assert.deepEqual(beforeAfter.schedule, {
  days: ["Mon", "Wed", "Fri"],
  time: "09:15",
  timezone: "America/Toronto",
});
assert.equal(beforeAfter.approvalRequired, true);
assert.equal(beforeAfter.hook.strategy, beforeAfterTemplate.hook);
assert.equal(beforeAfter.content.structure, beforeAfterTemplate.structure);
assert.equal(beforeAfter.content.slideCount, beforeAfterTemplate.slides);
assert.equal(beforeAfter.content.collectionId, null);
assert.equal(beforeAfter.content.sourceFileId, null);
assert.equal(beforeAfter.cta.style, beforeAfterTemplate.cta);
assert.equal(beforeAfter.createdAt, beforeAfter.updatedAt);
assert.equal(beforeAfter.lastRunAt, null);
assert.equal(beforeAfter.executionEnabled, false);
assert.deepEqual(beforeAfter.scheduler, createAutomationSchedulerState());
assert.equal(isAutomationRecord(beforeAfter), true);

const fallback = createAutomationRecord("not-a-real-template");
assert.equal(fallback.template, "story-lesson");
assert.equal(fallback.name, "Story lesson loop");

const workspaceDefaults = createAutomationRecord("story-lesson", {
  timezone: "Europe/London",
  approvalRequired: false,
  sourceFileId: "file-source-1",
});
assert.equal(workspaceDefaults.schedule.timezone, "Europe/London");
assert.equal(workspaceDefaults.approvalRequired, false);
assert.equal(workspaceDefaults.content.sourceFileId, "file-source-1");

assert.equal(isAutomationRecord(null), false);
assert.equal(isAutomationRecord([]), false);
assert.equal(isAutomationRecord({}), false);
assert.equal(isAutomationRecord({ ...beforeAfter, id: 123 }), false);
assert.equal(isAutomationRecord({ ...beforeAfter, status: "running" }), false);
assert.equal(isAutomationRecord({ ...beforeAfter, destination: "instagram" }), true);
assert.equal(isAutomationRecord({ ...beforeAfter, destination: "youtube" }), true);
assert.equal(isAutomationRecord({ ...beforeAfter, destination: "bluesky" }), false);
const legacyTikTokRecord = { ...beforeAfter, destination: "tiktok" as const };
delete (legacyTikTokRecord as Partial<typeof legacyTikTokRecord>).accountId;
assert.equal(
  isAutomationRecord(legacyTikTokRecord),
  true,
  "records saved before accountId existed must remain readable"
);
assert.equal(isAutomationRecord({ ...beforeAfter, schedule: null }), false);
assert.equal(
  isAutomationRecord({
    ...beforeAfter,
    schedule: { ...beforeAfter.schedule, days: "Mon" },
  }),
  false
);
assert.equal(isAutomationRecord({ ...beforeAfter, hook: null }), false);
assert.equal(
  isAutomationRecord({
    ...beforeAfter,
    content: { ...beforeAfter.content, slideCount: "6" },
  }),
  false
);
assert.equal(isAutomationRecord({ ...beforeAfter, approvalRequired: "yes" }), false);
assert.equal(
  isAutomationRecord({ ...beforeAfter, executionEnabled: "yes" }),
  false
);
assert.equal(isAutomationRecord({ ...beforeAfter, scheduler: null }), false);
assert.equal(
  isAutomationRecord({
    ...beforeAfter,
    scheduler: { ...beforeAfter.scheduler, lastJobId: 123 },
  }),
  false
);

const hookPrompt = "Growing a skincare account without paid ads";
assert.equal(
  composeAutomationHook("Curiosity gap", hookPrompt),
  "What nobody tells you about growing a skincare account without paid ads"
);
assert.equal(
  composeAutomationHook("Contrarian truth", hookPrompt),
  "The usual advice on growing a skincare account without paid ads is wrong"
);
assert.equal(
  composeAutomationHook("Specific transformation", "Reducing edit time by 40%. Keep it concise."),
  "How reducing edit time by 40% changed the outcome"
);
assert.equal(composeAutomationHook("Concrete promise", ""), "");
assert.notEqual(
  composeAutomationHook("Unexpected result", hookPrompt),
  composeAutomationHook("Unexpected result", "Posting one useful example every day"),
  "local hook composition must deterministically depend on the entered prompt"
);

assert.deepEqual(
  AUTOMATION_SOCIAL_DESTINATIONS.map((destination) => destination.id),
  ["tiktok", "instagram", "youtube"]
);
assert.equal(isAutomationSocialDestination("manual"), false);
assert.equal(isAutomationSocialDestination("instagram"), true);
assert.equal(automationDestinationLabel("manual"), "Review queue");
assert.equal(automationDestinationLabel("youtube"), "YouTube Shorts");

function integrationStatus(
  provider: IntegrationProvider,
  patch: Partial<PublicIntegrationStatus> = {}
): PublicIntegrationStatus {
  return {
    provider,
    displayName:
      provider === "tiktok"
        ? "TikTok"
        : provider === "instagram"
          ? "Instagram"
          : "YouTube",
    configuration: "ready",
    connected: true,
    account: {
      id: `${provider}-account-1`,
      username: "postforge",
      displayName: "PostForge Studio",
      avatarUrl: null,
      profileUrl: null,
    },
    grantedScopes: ["publish"],
    capabilities: {
      profile: true,
      ownedMedia: true,
      metrics: true,
      publish: true,
    },
    connectedAt: "2026-08-03T12:00:00.000Z",
    updatedAt: "2026-08-03T12:00:00.000Z",
    authorization: {
      status: "healthy",
      lastCheckedAt: "2026-08-03T12:00:00.000Z",
    },
    sync: {
      status: "ready",
      lastAttemptAt: "2026-08-03T12:00:00.000Z",
      lastSuccessfulAt: "2026-08-03T12:00:00.000Z",
      warnings: [],
    },
    publishingUnavailableReason: null,
    youtubeCompliance: null,
    connectUrl: `/api/integrations/${provider}/connect`,
    ...patch,
  };
}

const manualReadiness = resolveAutomationDestination("manual", []);
assert.equal(manualReadiness.ready, true);
assert.equal(manualReadiness.code, "manual");

const unavailableReadiness = resolveAutomationDestination("youtube", []);
assert.equal(unavailableReadiness.ready, false);
assert.equal(unavailableReadiness.code, "unavailable");

const notConfiguredReadiness = resolveAutomationDestination("instagram", [
  integrationStatus("instagram", {
    configuration: "not_configured",
    connected: false,
    account: null,
  }),
]);
assert.equal(notConfiguredReadiness.code, "not_configured");

const disconnectedReadiness = resolveAutomationDestination("tiktok", [
  integrationStatus("tiktok", { connected: false, account: null }),
]);
assert.equal(disconnectedReadiness.code, "disconnected");

const missingPublishReadiness = resolveAutomationDestination("youtube", [
  integrationStatus("youtube", {
    capabilities: {
      profile: true,
      ownedMedia: true,
      metrics: true,
      publish: false,
    },
  }),
]);
assert.equal(missingPublishReadiness.ready, false);
assert.equal(missingPublishReadiness.code, "missing_publish");
assert.equal(missingPublishReadiness.accountId, "youtube-account-1");

const missingInstagramProbeReadiness = resolveAutomationDestination(
  "instagram",
  [
    integrationStatus("instagram", {
      capabilities: {
        profile: true,
        ownedMedia: true,
        metrics: true,
        publish: false,
      },
      publishingUnavailableReason:
        "Instagram publishing requires an executable FFPROBE_PATH on the server before media can be verified.",
    }),
  ]
);
assert.equal(missingInstagramProbeReadiness.code, "missing_publish");
assert.match(missingInstagramProbeReadiness.message, /FFPROBE_PATH/);

const readyReadiness = resolveAutomationDestination("instagram", [
  integrationStatus("instagram"),
]);
assert.equal(readyReadiness.ready, true);
assert.equal(readyReadiness.code, "ready");
assert.equal(readyReadiness.accountId, "instagram-account-1");
assert.equal(
  readyReadiness.accountLabel,
  "PostForge Studio (@postforge)"
);

const unboundReadiness = resolveAutomationDestination(
  "instagram",
  [integrationStatus("instagram")],
  null
);
assert.equal(unboundReadiness.ready, false);
assert.equal(unboundReadiness.code, "account_unbound");

const changedAccountReadiness = resolveAutomationDestination(
  "instagram",
  [integrationStatus("instagram")],
  "instagram-previous-account"
);
assert.equal(changedAccountReadiness.ready, false);
assert.equal(changedAccountReadiness.code, "account_changed");
assert.equal(
  integrationAccountLabel({
    id: "anonymous-account",
    username: null,
    displayName: null,
    avatarUrl: null,
    profileUrl: null,
  }),
  "Connected account"
);

assert.equal(automationStatusAfterReview("manual", []), "paused");
assert.equal(
  automationStatusAfterReview("tiktok", [integrationStatus("tiktok")]),
  "paused",
  "a reviewed provider-backed workflow remains a local plan without a server executor"
);
assert.equal(
  automationStatusAfterReview("tiktok", [integrationStatus("tiktok")], {
    approvalRequired: false,
    accountId: "tiktok-account-1",
  }),
  "draft",
  "social publishing must never activate without approval"
);
assert.equal(
  automationStatusAfterReview("tiktok", [integrationStatus("tiktok")], {
    approvalRequired: true,
    accountId: "tiktok-previous-account",
  }),
  "needs_connection",
  "a reconnected provider must not silently retarget an existing automation"
);
assert.equal(
  automationStatusAfterReview("instagram", [
    integrationStatus("instagram", {
      capabilities: {
        profile: true,
        ownedMedia: true,
        metrics: true,
        publish: false,
      },
    }),
  ]),
  "needs_connection",
  "a connected account without publishing scope must stay gated"
);
assert.equal(
  automationStatusAfterReview("youtube", []),
  "needs_connection",
  "an unavailable provider must fail closed"
);

const reviewSpec = buildAutomationReviewDraftSpec(beforeAfter);
assert.deepEqual(
  reviewSpec,
  buildAutomationReviewDraftSpec(beforeAfter),
  "the same saved automation must produce the same review request"
);
assert.equal(reviewSpec.request.model, "nano-banana-2");
assert.equal(reviewSpec.request.aspectRatio, "4:5");
assert.equal(reviewSpec.request.numImages, 1);
assert.deepEqual(reviewSpec.jobTags, ["automation-review"]);
assert.match(reviewSpec.request.prompt, /The small change I wish I tried sooner/);
assert.match(reviewSpec.request.prompt, /Before → Change → After/);
assert.match(reviewSpec.request.prompt, /Each slide should make one concrete point/);
assert.match(reviewSpec.request.prompt, /Follow for part two/);
assert.match(reviewSpec.request.prompt, /review draft only/i);
assert.deepEqual(
  (reviewSpec.jobInput.provenance as { automationId?: string }).automationId,
  beforeAfter.id
);

assert.throws(
  () =>
    buildAutomationReviewDraftSpec({
      ...beforeAfter,
      hook: { ...beforeAfter.hook, selected: "" },
    }),
  AutomationReviewValidationError
);

async function testAutomationReviewRun() {
  const reviewEvents: string[] = [];
  const acceptedReview = await runAutomationReviewDraft(beforeAfter, {
    generate: async (request, options) => {
      reviewEvents.push("generate");
      assert.equal(request.prompt, reviewSpec.request.prompt);
      assert.deepEqual(options.jobTags, ["automation-review"]);
      return "review-job-1";
    },
    markAccepted: async (automationId, acceptedAt, jobId) => {
      reviewEvents.push("mark-accepted");
      assert.equal(automationId, beforeAfter.id);
      assert.equal(jobId, "review-job-1");
      return { ...beforeAfter, lastRunAt: acceptedAt, updatedAt: acceptedAt };
    },
    now: () => new Date("2026-08-03T18:30:00.000Z"),
  });
  assert.deepEqual(reviewEvents, ["generate", "mark-accepted"]);
  assert.equal(acceptedReview.jobId, "review-job-1");
  assert.equal(acceptedReview.acceptedAt, "2026-08-03T18:30:00.000Z");
  assert.equal(
    acceptedReview.automation?.lastRunAt,
    "2026-08-03T18:30:00.000Z"
  );

  let markedAfterRejectedGeneration = false;
  await assert.rejects(
    () =>
      runAutomationReviewDraft(beforeAfter, {
        generate: async () => {
          throw new Error("generation unavailable");
        },
        markAccepted: async () => {
          markedAfterRejectedGeneration = true;
          return beforeAfter;
        },
      }),
    /generation unavailable/
  );
  assert.equal(
    markedAfterRejectedGeneration,
    false,
    "lastRunAt must not change when generation was not accepted"
  );

  let markedWithoutJobId = false;
  await assert.rejects(
    () =>
      runAutomationReviewDraft(beforeAfter, {
        generate: async () => "   ",
        markAccepted: async () => {
          markedWithoutJobId = true;
          return beforeAfter;
        },
      }),
    /did not return a job id/
  );
  assert.equal(markedWithoutJobId, false);
}

async function testAutomationScheduler() {
  const scheduled: AutomationRecord = {
    ...beforeAfter,
    status: "active" as const,
    executionEnabled: true,
    schedule: {
      days: ["Mon"],
      time: "09:15",
      timezone: "America/Toronto",
    },
    scheduler: createAutomationSchedulerState(),
  };
  const dueNow = new Date("2026-08-03T13:20:00.000Z");
  const dueSlot = getDueAutomationScheduleSlot(scheduled, dueNow);
  assert.deepEqual(dueSlot, {
    key: "America/Toronto|2026-08-03|09:15",
    day: "Mon",
    date: "2026-08-03",
    time: "09:15",
    timezone: "America/Toronto",
  });
  assert.equal(
    getDueAutomationScheduleSlot(
      scheduled,
      new Date("2026-08-03T13:14:00.000Z")
    ),
    null,
    "the Toronto slot must not be due before its local wall-clock time"
  );
  assert.equal(
    getDueAutomationScheduleSlot(
      {
        ...scheduled,
        schedule: {
          days: ["Mon"],
          time: "14:15",
          timezone: "Europe/London",
        },
      },
      dueNow
    )?.key,
    "Europe/London|2026-08-03|14:15",
    "the same instant must be evaluated in each automation timezone"
  );

  const fallBackSchedule: AutomationRecord = {
    ...scheduled,
    schedule: {
      days: ["Sun"],
      time: "01:30",
      timezone: "America/Toronto",
    },
    scheduler: createAutomationSchedulerState(),
  };
  const firstFallBackSlot = getDueAutomationScheduleSlot(
    fallBackSchedule,
    new Date("2026-11-01T05:30:00.000Z")
  );
  const repeatedFallBackSlot = getDueAutomationScheduleSlot(
    fallBackSchedule,
    new Date("2026-11-01T06:30:00.000Z")
  );
  assert.equal(
    firstFallBackSlot?.key,
    "America/Toronto|2026-11-01|01:30"
  );
  assert.equal(
    repeatedFallBackSlot?.key,
    firstFallBackSlot?.key,
    "both fall-back 01:30 instants must resolve to one local schedule slot"
  );
  assert.equal(
    getDueAutomationScheduleSlot(
      {
        ...fallBackSchedule,
        scheduler: {
          ...fallBackSchedule.scheduler,
          lastClaimedSlot: firstFallBackSlot?.key,
        },
      },
      new Date("2026-11-01T06:30:00.000Z")
    ),
    null,
    "the persisted local slot claim must suppress the repeated fall-back hour"
  );

  const legacyActive = { ...scheduled };
  delete (legacyActive as Partial<typeof legacyActive>).executionEnabled;
  assert.equal(
    getDueAutomationScheduleSlot(legacyActive, dueNow),
    null,
    "legacy active records without the opt-in gate must remain inactive"
  );
  assert.equal(
    getDueAutomationScheduleSlot(
      { ...scheduled, destination: "instagram" },
      dueNow
    ),
    null,
    "the local scheduler must never run a social destination"
  );
  assert.equal(
    validateAutomationSchedule({
      days: ["Mon"],
      time: "25:00",
      timezone: "America/Toronto",
    }),
    "Schedule time must use a valid 24-hour HH:mm value."
  );
  assert.equal(
    validateAutomationSchedule({
      days: ["Mon"],
      time: "09:15",
      timezone: "Not/A_Timezone",
    }),
    "Schedule timezone is not recognized by this server."
  );

  let stored = [scheduled];
  let generatedCount = 0;
  const accepted: Array<{ slot: string; jobId: string }> = [];
  const dependencies: AutomationSchedulerDependencies = {
    list: async () => stored,
    claim: async (
      automationId: string,
      slot: AutomationScheduleSlot,
      claimedAt: string,
      now: Date
    ) => {
      const current = stored.find((record) => record.id === automationId);
      const currentSlot = current
        ? getDueAutomationScheduleSlot(current, now)
        : null;
      if (!current || currentSlot?.key !== slot.key) return null;
      const claimed = {
        ...current,
        scheduler: {
          ...current.scheduler,
          lastClaimedSlot: slot.key,
          lastClaimedAt: claimedAt,
        },
      };
      stored = [claimed];
      return claimed;
    },
    generateReviewDraft: async (automation, slot) => {
      generatedCount += 1;
      const scheduledSpec = buildAutomationReviewDraftSpec(automation, {
        scheduleSlot: slot,
      });
      assert.deepEqual(
        (
          scheduledSpec.jobInput.provenance as {
            scheduleSlot?: AutomationScheduleSlot;
          }
        ).scheduleSlot,
        slot
      );
      return "scheduled-review-job-1";
    },
    markAccepted: async (
      _automationId: string,
      slot: AutomationScheduleSlot,
      jobId: string,
      acceptedAt: string
    ) => {
      accepted.push({ slot: slot.key, jobId });
      stored = [
        {
          ...stored[0],
          lastRunAt: acceptedAt,
          scheduler: {
            ...stored[0].scheduler,
            lastJobId: jobId,
            lastError: null,
            lastErrorAt: null,
          },
        },
      ];
    },
    markFailed: async () => {
      assert.fail("the successful scheduled draft must not be marked failed");
    },
    now: () => dueNow,
  };

  const concurrentTicks = await Promise.all([
    runAutomationSchedulerTick(dependencies),
    runAutomationSchedulerTick(dependencies),
  ]);
  assert.equal(generatedCount, 1, "an atomic slot claim must submit only one job");
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].jobId, "scheduled-review-job-1");
  assert.equal(
    concurrentTicks.flat().filter((result) => result.outcome === "accepted")
      .length,
    1
  );
  assert.deepEqual(
    await runAutomationSchedulerTick(dependencies),
    [],
    "a persisted claim must make the same local slot idempotent on later ticks"
  );

  stored = [scheduled];
  let storedFailure: string | null = null;
  const failedResults = await runAutomationSchedulerTick({
    ...dependencies,
    generateReviewDraft: async () => {
      const error = new Error("Selected hook is required");
      error.name = "AutomationReviewValidationError";
      throw error;
    },
    markAccepted: async () => {
      assert.fail("a rejected scheduled submission must not be marked accepted");
    },
    markFailed: async (_automationId, slot, message, failedAt) => {
      storedFailure = message;
      stored = [
        {
          ...stored[0],
          scheduler: {
            ...stored[0].scheduler,
            lastClaimedSlot: slot.key,
            lastError: message,
            lastErrorAt: failedAt,
          },
        },
      ];
    },
  });
  assert.equal(failedResults[0]?.outcome, "failed");
  assert.equal(storedFailure, "Selected hook is required");
  assert.equal(stored[0].lastRunAt, null);
}

async function testAutomationScheduleRouteSecurity() {
  const context = { params: Promise.resolve({ id: beforeAfter.id }) };
  const crossOrigin = await updateAutomationSchedule(
    new Request(
      `https://postforge.example/api/automations/${beforeAfter.id}/schedule`,
      {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          "Sec-Fetch-Site": "cross-site",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "activate" }),
      }
    ),
    context
  );
  assert.equal(crossOrigin.status, 403);

  const missingOrigin = await updateAutomationSchedule(
    new Request(
      `https://postforge.example/api/automations/${beforeAfter.id}/schedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      }
    ),
    context
  );
  assert.equal(missingOrigin.status, 403);
}

Promise.all([
  testAutomationReviewRun(),
  testAutomationScheduler(),
  testAutomationScheduleRouteSecurity(),
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
