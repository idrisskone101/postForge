import { generateImage } from "@/lib/ai/generate-image";
import { buildAutomationReviewDraftSpec } from "@/lib/automation-review";
import {
  getDueAutomationScheduleSlot,
  runAutomationSchedulerTick,
  type AutomationScheduleSlot,
} from "@/lib/automation-schedule";
import {
  isAutomationRecord,
  type AutomationRecord,
} from "@/lib/automations";
import {
  readWorkspaceFeatureRecords,
  updateWorkspaceFeatureRecords,
} from "@/lib/workspace-feature-store";

const SCHEDULER_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = SCHEDULER_INTERVAL_MS * 3;

const globalForAutomationScheduler = globalThis as unknown as {
  __postforge_automation_scheduler_interval: ReturnType<typeof setInterval> | null;
  __postforge_automation_scheduler_ticking: boolean;
  __postforge_automation_scheduler_heartbeat: number;
};

function schedulerIsRunning() {
  if (!globalForAutomationScheduler.__postforge_automation_scheduler_interval) {
    return false;
  }
  const heartbeat =
    globalForAutomationScheduler.__postforge_automation_scheduler_heartbeat ?? 0;
  if (Date.now() - heartbeat > STALE_THRESHOLD_MS) {
    clearInterval(
      globalForAutomationScheduler.__postforge_automation_scheduler_interval
    );
    globalForAutomationScheduler.__postforge_automation_scheduler_interval = null;
    return false;
  }
  return true;
}

async function claimScheduleSlot(
  automationId: string,
  slot: AutomationScheduleSlot,
  claimedAt: string,
  now: Date
) {
  let claimed: AutomationRecord | null = null;
  await updateWorkspaceFeatureRecords<AutomationRecord>(
    "automations",
    (records) =>
      records.map((candidate) => {
        if (candidate.id !== automationId || !isAutomationRecord(candidate)) {
          return candidate;
        }
        const currentSlot = getDueAutomationScheduleSlot(candidate, now);
        if (!currentSlot || currentSlot.key !== slot.key) return candidate;

        claimed = {
          ...candidate,
          scheduler: {
            ...candidate.scheduler,
            lastClaimedSlot: slot.key,
            lastClaimedAt: claimedAt,
          },
          updatedAt: claimedAt,
        };
        return claimed;
      })
  );
  return claimed;
}

async function markScheduleAccepted(
  automationId: string,
  slot: AutomationScheduleSlot,
  jobId: string,
  acceptedAt: string
) {
  await updateWorkspaceFeatureRecords<AutomationRecord>(
    "automations",
    (records) =>
      records.map((candidate) =>
        candidate.id === automationId &&
        isAutomationRecord(candidate) &&
        candidate.scheduler?.lastClaimedSlot === slot.key
          ? {
              ...candidate,
              lastRunAt: acceptedAt,
              scheduler: {
                ...candidate.scheduler,
                lastJobId: jobId,
                lastError: null,
                lastErrorAt: null,
              },
              updatedAt: acceptedAt,
            }
          : candidate
      )
  );
}

async function markScheduleFailed(
  automationId: string,
  slot: AutomationScheduleSlot,
  message: string,
  failedAt: string
) {
  await updateWorkspaceFeatureRecords<AutomationRecord>(
    "automations",
    (records) =>
      records.map((candidate) =>
        candidate.id === automationId &&
        isAutomationRecord(candidate) &&
        candidate.scheduler?.lastClaimedSlot === slot.key
          ? {
              ...candidate,
              scheduler: {
                ...candidate.scheduler,
                lastError: message,
                lastErrorAt: failedAt,
              },
              updatedAt: failedAt,
            }
          : candidate
      )
  );
}

export async function runAutomationSchedulerWorkerTick() {
  return runAutomationSchedulerTick({
    list: async () =>
      (
        await readWorkspaceFeatureRecords<AutomationRecord>("automations")
      ).filter(isAutomationRecord),
    claim: claimScheduleSlot,
    generateReviewDraft: async (automation, slot) => {
      const spec = await buildAutomationReviewDraftSpec(automation, {
        scheduleSlot: {
          key: slot.key,
          date: slot.date,
          time: slot.time,
          timezone: slot.timezone,
        },
      });
      return generateImage(spec.request, undefined, {
        jobInput: spec.jobInput,
        jobTags: spec.jobTags,
      });
    },
    markAccepted: markScheduleAccepted,
    markFailed: markScheduleFailed,
  });
}

async function runWorkerTickWithoutOverlap() {
  if (globalForAutomationScheduler.__postforge_automation_scheduler_ticking) {
    return;
  }
  globalForAutomationScheduler.__postforge_automation_scheduler_ticking = true;
  try {
    await runAutomationSchedulerWorkerTick();
  } finally {
    globalForAutomationScheduler.__postforge_automation_scheduler_ticking = false;
  }
}

export function ensureAutomationSchedulerRunning() {
  if (!schedulerIsRunning()) {
    globalForAutomationScheduler.__postforge_automation_scheduler_ticking = false;
    globalForAutomationScheduler.__postforge_automation_scheduler_heartbeat =
      Date.now();
    globalForAutomationScheduler.__postforge_automation_scheduler_interval =
      setInterval(() => {
        globalForAutomationScheduler.__postforge_automation_scheduler_heartbeat =
          Date.now();
        runWorkerTickWithoutOverlap().catch((error) => {
          console.error(
            "[automation-scheduler] Tick failed:",
            error instanceof Error ? error.name : "UnknownError"
          );
        });
      }, SCHEDULER_INTERVAL_MS);
  }

  runWorkerTickWithoutOverlap().catch((error) => {
    console.error(
      "[automation-scheduler] Initial tick failed:",
      error instanceof Error ? error.name : "UnknownError"
    );
  });
}

export function stopAutomationScheduler() {
  if (globalForAutomationScheduler.__postforge_automation_scheduler_interval) {
    clearInterval(
      globalForAutomationScheduler.__postforge_automation_scheduler_interval
    );
    globalForAutomationScheduler.__postforge_automation_scheduler_interval = null;
  }
}
