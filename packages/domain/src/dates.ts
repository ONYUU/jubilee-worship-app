import { SITE } from "./constants";

const MILLISECONDS_PER_DAY = 86_400_000;
const SEOUL_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1_000;
const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const OFFSET_DATE_TIME_PATTERN = /(?:Z|[+-]\d{2}:\d{2})$/;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const seoulDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SITE.timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function parseDateInput(value: Date | string | number): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Invalid date input");
  }
  return date;
}

function validCalendarParts(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): boolean {
  if (year < 1_000 || year > 9_999) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

function formatInstantInSeoul(date: Date): string {
  const seoulClock = new Date(date.getTime() + SEOUL_OFFSET_MILLISECONDS);
  const milliseconds = seoulClock.getUTCMilliseconds();
  const fractional = milliseconds === 0 ? "" : `.${pad(milliseconds, 3)}`;

  return [
    `${pad(seoulClock.getUTCFullYear(), 4)}-${pad(
      seoulClock.getUTCMonth() + 1
    )}-${pad(seoulClock.getUTCDate())}`,
    `T${pad(seoulClock.getUTCHours())}:${pad(
      seoulClock.getUTCMinutes()
    )}:${pad(seoulClock.getUTCSeconds())}${fractional}+09:00`
  ].join("");
}

/**
 * Converts an admin `datetime-local` value to an offset-bearing ISO string in
 * Asia/Seoul. Offset-bearing input is converted to the equivalent Seoul time.
 * Invalid or zone-less non-local values return null.
 */
export function normalizeSeoulDateTimeInput(input: string): string | null {
  const value = input.trim();
  const localMatch = LOCAL_DATE_TIME_PATTERN.exec(value);

  if (localMatch !== null) {
    const [, yearText, monthText, dayText, hourText, minuteText, secondText, ms] =
      localMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText ?? "0");

    if (!validCalendarParts(year, month, day, hour, minute, second)) {
      return null;
    }

    const fractional = ms === undefined ? "" : `.${ms.padEnd(3, "0")}`;
    return `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${pad(
      second
    )}${fractional}+09:00`;
  }

  if (!OFFSET_DATE_TIME_PATTERN.test(value)) {
    return null;
  }

  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : formatInstantInSeoul(instant);
}

export function isValidDateOnly(input: string): boolean {
  const match = DATE_ONLY_PATTERN.exec(input);
  if (match === null) {
    return false;
  }

  return validCalendarParts(
    Number(match[1]),
    Number(match[2]),
    Number(match[3])
  );
}

function getSeoulDayOrdinal(value: Date | string | number): number {
  const parts = seoulDateFormatter.formatToParts(parseDateInput(value));
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (![year, month, day].every(Number.isFinite)) {
    throw new RangeError("Unable to resolve an Asia/Seoul calendar date");
  }

  return Math.floor(Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY);
}

/**
 * Returns calendar days until the target in Asia/Seoul: 0 for D-Day, a
 * positive number before the event, and a negative number after it.
 */
export function getSeoulDday(
  target: Date | string | number,
  now: Date | string | number = new Date()
): number {
  return getSeoulDayOrdinal(target) - getSeoulDayOrdinal(now);
}
