import {
  isAutomationExecutionEnabled,
  type AutomationRecord,
} from "./automations";

const SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

export type AutomationScheduleSlot = {
  key: string;
  day: ScheduleDay;
  date: string;
  time: string;
  timezone: string;
};

export type AutomationSchedulerTickResult = {
  automationId: string;
  slot: string;
  outcome: "claimed" | "skipped" | "accepted" | "failed";
  jobId?: string;
};

export type AutomationSchedulerDependencies = {
  list: () => Promise<AutomationRecord[]>;
  claim: (
    automationId: string,
    slot: AutomationScheduleSlot,
    claimedAt: string,
    now: Date
  ) => Promise<AutomationRecord | null>;
  generateReviewDraft: (
    automation: AutomationRecord,
    slot: AutomationScheduleSlot
  ) => Promise<string>;
  markAccepted: (
    automationId: string,
    slot: AutomationScheduleSlot,
    jobId: string,
    acceptedAt: string
  ) => Promise<void>;
  markFailed: (
    automationId: string,
    slot: AutomationScheduleSlot,
    message: string,
    failedAt: string
  ) => Promise<void>;
  now?: () => Date;
};

function timeInMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function localScheduleParts(now: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value])
    );
    const day = values.weekday as ScheduleDay | undefined;
    if (!day || !SCHEDULE_DAYS.includes(day)) return null;
    const hour = Number(values.hour);
    const minute = Number(values.minute);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    return {
      day,
      date: `${values.year}-${values.month}-${values.day}`,
      minuteOfDay: hour * 60 + minute,
    };
  } catch {
    return null;
  }
}

export function validateAutomationSchedule(
  schedule: AutomationRecord["schedule"]
): string | null {
  if (
    schedule.days.length === 0 ||
    schedule.days.some(
      (day) => !SCHEDULE_DAYS.includes(day as ScheduleDay)
    )
  ) {
    return "Choose at least one valid schedule day.";
  }
  if (timeInMinutes(schedule.time) === null) {
    return "Schedule time must use a valid 24-hour HH:mm value.";
  }
  if (!localScheduleParts(new Date(), schedule.timezone)) {
    return "Schedule timezone is not recognized by this server.";
  }
  return null;
}

export function getDueAutomationScheduleSlot(
  automation: AutomationRecord,
  now: Date
): AutomationScheduleSlot | null {
  if (
    automation.status !== "active" ||
    !isAutomationExecutionEnabled(automation) ||
    automation.destination !== "manual"
  ) {
    return null;
  }

  const scheduledMinute = timeInMinutes(automation.schedule.time);
  const local = localScheduleParts(now, automation.schedule.timezone);
  if (
    scheduledMinute === null ||
    !local ||
    !automation.schedule.days.includes(local.day) ||
    local.minuteOfDay < scheduledMinute
  ) {
    return null;
  }

  const slot = {
    key: `${automation.schedule.timezone}|${local.date}|${automation.schedule.time}`,
    day: local.day,
    date: local.date,
    time: automation.schedule.time,
    timezone: automation.schedule.timezone,
  } satisfies AutomationScheduleSlot;

  return automation.scheduler?.lastClaimedSlot === slot.key ? null : slot;
}

function schedulerFailureMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.name === "AutomationReviewValidationError" &&
    error.message.trim()
  ) {
    return error.message.trim().slice(0, 1_000);
  }
  return "The scheduled review draft could not be submitted. Use Generate review draft to retry manually.";
}

export async function runAutomationSchedulerTick(
  dependencies: AutomationSchedulerDependencies
): Promise<AutomationSchedulerTickResult[]> {
  const now = (dependencies.now ?? (() => new Date()))();
  const claimedAt = now.toISOString();
  const automations = await dependencies.list();
  const due = automations.flatMap((automation) => {
    const slot = getDueAutomationScheduleSlot(automation, now);
    return slot ? [{ automation, slot }] : [];
  });

  return Promise.all(
    due.map(async ({ automation, slot }) => {
      const claimed = await dependencies.claim(
        automation.id,
        slot,
        claimedAt,
        now
      );
      if (!claimed) {
        return {
          automationId: automation.id,
          slot: slot.key,
          outcome: "skipped",
        } satisfies AutomationSchedulerTickResult;
      }

      try {
        const jobId = await dependencies.generateReviewDraft(claimed, slot);
        if (!jobId.trim()) {
          throw new Error("Review draft generation returned no job id");
        }
        const acceptedAt = (
          dependencies.now ?? (() => new Date())
        )().toISOString();
        await dependencies.markAccepted(
          claimed.id,
          slot,
          jobId,
          acceptedAt
        );
        return {
          automationId: claimed.id,
          slot: slot.key,
          outcome: "accepted",
          jobId,
        } satisfies AutomationSchedulerTickResult;
      } catch (error) {
        const failedAt = (
          dependencies.now ?? (() => new Date())
        )().toISOString();
        await dependencies.markFailed(
          claimed.id,
          slot,
          schedulerFailureMessage(error),
          failedAt
        );
        return {
          automationId: claimed.id,
          slot: slot.key,
          outcome: "failed",
        } satisfies AutomationSchedulerTickResult;
      }
    })
  );
}
