import { toZonedTime, fromZonedTime, format as tzFormat } from "date-fns-tz";
import {
  addDays,
  differenceInCalendarDays,
  startOfWeek,
  parseISO,
  isWithinInterval,
  eachDayOfInterval,
} from "date-fns";

/**
 * Returns the user's local calendar date as YYYY-MM-DD.
 * NEVER use new Date().toISOString().slice(0,10) for date logic.
 */
export function getLocalDate(timezone: string): string {
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  return tzFormat(zoned, "yyyy-MM-dd", { timeZone: timezone });
}

/**
 * Converts a UTC timestamp string to the user's local YYYY-MM-DD date.
 */
export function toUserDate(utcTimestamp: string, timezone: string): string {
  const zoned = toZonedTime(new Date(utcTimestamp), timezone);
  return tzFormat(zoned, "yyyy-MM-dd", { timeZone: timezone });
}

/**
 * Returns the Monday of the week containing the given YYYY-MM-DD date,
 * in the user's timezone.
 */
export function getWeekStart(date: string, timezone: string): string {
  const local = toZonedTime(parseISO(date), timezone);
  const monday = startOfWeek(local, { weekStartsOn: 1 });
  return tzFormat(monday, "yyyy-MM-dd", { timeZone: timezone });
}

/**
 * Returns an array of YYYY-MM-DD strings from start to end (inclusive).
 */
export function getDateRange(start: string, end: string): string[] {
  const s = parseISO(start);
  const e = parseISO(end);
  if (s > e) return [];
  return eachDayOfInterval({ start: s, end: e }).map(
    (d) => d.toISOString().slice(0, 10) // safe here: no timezone, just iterating calendar days
  );
}

/**
 * Returns true if date is within [start, end] inclusive.
 */
export function isDateInRange(
  date: string,
  start: string,
  end: string
): boolean {
  const d = parseISO(date);
  return isWithinInterval(d, { start: parseISO(start), end: parseISO(end) });
}

/**
 * Returns how many calendar days have elapsed since startDate (1-indexed).
 * Day 1 = the start date itself.
 */
export function daysSinceStart(startDate: string, date: string): number {
  return differenceInCalendarDays(parseISO(date), parseISO(startDate)) + 1;
}

/**
 * Returns how many calendar days remain until endDate (inclusive).
 * Returns 0 if date >= endDate.
 */
export function daysUntilEnd(endDate: string, date: string): number {
  const diff = differenceInCalendarDays(parseISO(endDate), parseISO(date));
  return Math.max(0, diff);
}

/**
 * Returns the date string for yesterday relative to the given date.
 */
export function getYesterday(date: string): string {
  return addDays(parseISO(date), -1).toISOString().slice(0, 10);
}

/**
 * Returns the day-of-week integer (0=Sun, 1=Mon, ..., 6=Sat) for a YYYY-MM-DD date.
 */
export function getDayOfWeek(date: string): number {
  return parseISO(date).getDay();
}

/**
 * Formats seconds into "Xh Ym" display string.
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Formats seconds into HH:MM:SS for the focus timer display.
 */
export function formatTimerDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Returns the elapsed seconds since a UTC started_at timestamp.
 * This is the canonical timer calculation — always use server time as truth.
 */
export function getElapsedSeconds(startedAt: string): number {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
}
