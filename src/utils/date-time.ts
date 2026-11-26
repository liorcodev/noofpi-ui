import { parseISO } from "./date";

// Date-times are `YYYY-MM-DDTHH:mm[:ss]` wall-clock strings: no zone, so nothing here ever shifts with daylight saving

const DATE_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const TIME = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

const pad = (value: number) => String(value).padStart(2, "0");

export interface TimeParts {
  hour: number;
  minute: number;
  second: number;
}

export interface DateTimeParts extends TimeParts {
  date: string;
}

export const toSeconds = ({ hour, minute, second }: TimeParts) =>
  hour * 3600 + minute * 60 + second;

export const fromSeconds = (total: number): TimeParts => ({
  hour: Math.floor(total / 3600),
  minute: Math.floor((total % 3600) / 60),
  second: total % 60,
});

function inRange({ hour, minute, second }: TimeParts) {
  return hour < 24 && minute < 60 && second < 60;
}

export function parseTime(value: unknown): TimeParts | null {
  if (typeof value !== "string") return null;
  const match = TIME.exec(value);
  if (!match) return null;
  const parts = {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: Number(match[3] ?? 0),
  };
  return inRange(parts) ? parts : null;
}

export function parseDateTime(value: unknown): DateTimeParts | null {
  if (typeof value !== "string") return null;
  const match = DATE_TIME.exec(value);
  if (!match || !parseISO(match[1])) return null;
  const parts = {
    hour: Number(match[2]),
    minute: Number(match[3]),
    second: Number(match[4] ?? 0),
  };
  return inRange(parts) ? { date: match[1]!, ...parts } : null;
}

export function formatDateTime(
  date: string,
  time: TimeParts,
  seconds: boolean,
): string {
  const base = `${date}T${pad(time.hour)}:${pad(time.minute)}`;
  return seconds ? `${base}:${pad(time.second)}` : base;
}

export function formatDateTimeLabel(
  { date, hour, minute, second }: DateTimeParts,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, hour, minute, second)));
}

/** Whether `locale` shows hours on a 12-hour clock; 24-hour when Intl can't tell */
export function prefersHour12(locale: string | undefined): boolean {
  try {
    return (
      new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions()
        .hour12 ?? false
    );
  } catch {
    return false;
  }
}

/** The locale's "AM" and "PM" */
export function dayPeriods(locale: string | undefined): [string, string] {
  const name = (hour: number) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        hour12: true,
        timeZone: "UTC",
      })
        .formatToParts(new Date(Date.UTC(2000, 0, 1, hour)))
        .find((part) => part.type === "dayPeriod")?.value;
    } catch {
      return undefined;
    }
  };
  return [name(0) ?? "AM", name(12) ?? "PM"];
}

/** Short zone name ("GMT+2", "EST") of `timeZone` at `date`, or "" when the zone is unknown */
export function zoneName(
  timeZone: string,
  date: string,
  locale: string | undefined,
): string {
  try {
    const at = parseISO(date) ?? new Date();
    at.setUTCHours(12);
    return (
      new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" })
        .formatToParts(at)
        .find((part) => part.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
}
