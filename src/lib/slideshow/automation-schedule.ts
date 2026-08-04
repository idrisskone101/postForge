const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const WEEKDAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

const WEEKDAY_ALIASES: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

export type SlideshowAutomationSchedule = {
  /** JavaScript weekday numbers: Sunday is 0 and Saturday is 6. */
  weekdays: number[];
  /** Local wall-clock time in 24-hour HH:mm form. */
  time: string;
  /** IANA timezone identifier, for example America/Toronto. */
  timezone: string;
};

type LocalDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function scheduleRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Automation schedule must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

function formatterFor(timezone: string) {
  let formatter = formatterCache.get(timezone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });
      // Some engines defer invalid-zone validation until the first format call.
      formatter.format(new Date(0));
    } catch {
      throw new Error(`Invalid IANA timezone: ${timezone}`);
    }
    formatterCache.set(timezone, formatter);
  }
  return formatter;
}

function localDateTime(instant: Date, timezone: string): LocalDateTime {
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const part of formatterFor(timezone).formatToParts(instant)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year ?? 0,
    month: values.month ?? 0,
    day: values.day ?? 0,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

function wallClockEpoch(value: LocalDateTime) {
  return Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    value.second,
  );
}

function sameLocalMinute(
  value: LocalDateTime,
  date: Pick<LocalDateTime, "year" | "month" | "day">,
  hour: number,
  minute: number,
) {
  return (
    value.year === date.year &&
    value.month === date.month &&
    value.day === date.day &&
    value.hour === hour &&
    value.minute === minute
  );
}

function sameLocalDate(
  value: LocalDateTime,
  date: Pick<LocalDateTime, "year" | "month" | "day">,
) {
  return (
    value.year === date.year &&
    value.month === date.month &&
    value.day === date.day
  );
}

function possibleOffsets(naiveEpoch: number, timezone: string) {
  const offsets = new Set<number>();
  // Sampling both sides of the target covers every current IANA transition,
  // including zones whose DST shift is not exactly one hour.
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = new Date(naiveEpoch + hours * HOUR_MS);
    const roundedSampleEpoch = Math.floor(sample.getTime() / 1_000) * 1_000;
    offsets.add(wallClockEpoch(localDateTime(sample, timezone)) - roundedSampleEpoch);
  }
  return [...offsets];
}

function localDateCandidates(
  date: Pick<LocalDateTime, "year" | "month" | "day">,
  hour: number,
  minute: number,
  timezone: string,
) {
  const naiveEpoch = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
  const candidates = possibleOffsets(naiveEpoch, timezone)
    .map((offset) => new Date(naiveEpoch - offset))
    .filter((candidate) => !Number.isNaN(candidate.getTime()));

  const exact = candidates
    .filter((candidate) =>
      sameLocalMinute(localDateTime(candidate, timezone), date, hour, minute),
    )
    .sort((left, right) => left.getTime() - right.getTime());

  if (exact.length) {
    return exact.filter(
      (candidate, index) =>
        index === 0 || candidate.getTime() !== exact[index - 1].getTime(),
    );
  }

  // A time inside a spring-forward gap has no exact instant. Match Temporal's
  // "compatible" behavior by moving it forward by the size of the gap. For
  // example, 02:30 becomes 03:30 when clocks jump from 02:00 to 03:00.
  const targetMinute = hour * 60 + minute;
  return candidates
    .map((candidate) => ({
      candidate,
      local: localDateTime(candidate, timezone),
    }))
    .filter(
      ({ local }) =>
        sameLocalDate(local, date) && local.hour * 60 + local.minute > targetMinute,
    )
    .sort((left, right) => {
      const leftMinute = left.local.hour * 60 + left.local.minute;
      const rightMinute = right.local.hour * 60 + right.local.minute;
      return (
        leftMinute - rightMinute ||
        left.candidate.getTime() - right.candidate.getTime()
      );
    })
    .slice(0, 1)
    .map(({ candidate }) => candidate);
}

function addLocalDays(
  date: Pick<LocalDateTime, "year" | "month" | "day">,
  days: number,
) {
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  };
}

function weekdayFor(date: Pick<LocalDateTime, "year" | "month" | "day">) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

function weekdayFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    if (value >= 0 && value <= 6) return value;
    // Also accept ISO's Sunday value while keeping 1=Monday through 6=Saturday.
    if (value === 7) return 0;
    return null;
  }
  if (typeof value !== "string") return null;
  return WEEKDAY_ALIASES[value.trim().toLowerCase()] ?? null;
}

function weekdaysFromCadence(cadence: string) {
  if (/\b(daily|every\s+day)\b/i.test(cadence)) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  const matches = cadence.match(
    /\b(?:sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:s|nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\b/gi,
  );
  return (matches ?? [])
    .map(weekdayFrom)
    .filter((value): value is number => value !== null);
}

function timeFrom(value: unknown, cadence: string) {
  const direct = typeof value === "string" ? value.trim() : "";
  const cadenceMatch = cadence.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/);
  const time = direct || cadenceMatch?.[0] || "";
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    throw new Error("Automation schedule time must use 24-hour HH:mm format.");
  }
  return time;
}

export function parseSlideshowAutomationSchedule(
  value: unknown,
): SlideshowAutomationSchedule {
  const schedule = scheduleRecord(value);
  const cadence = typeof schedule.cadence === "string" ? schedule.cadence : "";
  const explicitDays = schedule.weekdays ?? schedule.days;
  const rawDays = Array.isArray(explicitDays)
    ? explicitDays
    : typeof explicitDays === "string"
      ? explicitDays.split(/[\s,]+/)
      : [];
  const weekdays = (rawDays.length ? rawDays.map(weekdayFrom) : weekdaysFromCadence(cadence))
    .filter((weekday): weekday is number => weekday !== null)
    .filter((weekday, index, all) => all.indexOf(weekday) === index)
    .sort((left, right) => left - right);
  if (!weekdays.length) {
    throw new Error(
      `Automation schedule needs at least one weekday (${WEEKDAY_NAMES.join(", ")}).`,
    );
  }

  const timezoneValue = schedule.timezone ?? schedule.timeZone;
  const timezone =
    typeof timezoneValue === "string" && timezoneValue.trim()
      ? timezoneValue.trim()
      : "UTC";
  formatterFor(timezone);

  return {
    weekdays,
    time: timeFrom(schedule.time ?? schedule.localTime, cadence),
    timezone,
  };
}

/** Returns the first scheduled instant strictly after `after`. */
export function nextSlideshowAutomationRun(
  rawSchedule: unknown,
  after: Date,
): Date {
  if (Number.isNaN(after.getTime())) {
    throw new Error("The schedule anchor must be a valid date.");
  }
  const schedule = parseSlideshowAutomationSchedule(rawSchedule);
  const [hour, minute] = schedule.time.split(":").map(Number);
  const localAnchor = localDateTime(after, schedule.timezone);

  for (let days = 0; days <= 14; days += 1) {
    const date = addLocalDays(localAnchor, days);
    if (!schedule.weekdays.includes(weekdayFor(date))) continue;
    for (const candidate of localDateCandidates(
      date,
      hour,
      minute,
      schedule.timezone,
    )) {
      if (candidate.getTime() > after.getTime()) return candidate;
    }
  }

  throw new Error("Could not resolve the next automation run within two weeks.");
}
