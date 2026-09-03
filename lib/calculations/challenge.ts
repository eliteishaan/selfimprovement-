import {
  type Challenge,
  type ChallengePhase,
  type Habit,
  type HabitCompletion,
  type HabitException,
  type ChallengeHealth,
  type HealthStatus,
} from "@/types";
import {
  daysSinceStart,
  daysUntilEnd,
  isDateInRange,
} from "@/lib/dates";
import { differenceInCalendarDays, parseISO } from "date-fns";

/**
 * Returns the 1-indexed day number within the challenge.
 * Day 1 = start_date.
 */
export function getChallengeDay(
  challenge: Challenge,
  date: string,
): number {
  return daysSinceStart(challenge.startDate, date);
}

/**
 * Returns the number of calendar days remaining until end_date (inclusive).
 */
export function getDaysRemaining(
  challenge: Challenge,
  date: string,
): number {
  return daysUntilEnd(challenge.endDate, date);
}

/**
 * Returns days elapsed / total days as a 0–100 percentage.
 * This is TIME progress — not execution, not outcome.
 * Labelled "TIME ELAPSED" in the UI to avoid confusion.
 */
export function getChallengeTimeProgress(
  challenge: Challenge,
  date: string,
): number {
  const totalDays =
    differenceInCalendarDays(
      parseISO(challenge.endDate),
      parseISO(challenge.startDate)
    ) + 1;
  if (totalDays <= 0) return 100;
  const elapsed = daysSinceStart(challenge.startDate, date);
  return Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
}

/**
 * Returns the active phase for the given date, or null if none.
 */
export function getCurrentPhase(
  challenge: Challenge,
  phases: ChallengePhase[],
  date: string,
): ChallengePhase | null {
  let currentDate = parseISO(challenge.startDate);
  const sorted = [...phases].sort((a, b) => a.orderIndex - b.orderIndex);
  for (const p of sorted) {
    const pStart = currentDate.toISOString().slice(0, 10);
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + p.durationDays);
    const pEnd = new Date(nextDate.getTime() - 86400000).toISOString().slice(0, 10);
    if (isDateInRange(date, pStart, pEnd)) return p;
    currentDate = nextDate;
  }
  return null;
}

/**
 * Computes Challenge Health based on recent execution data.
 *
 * Rules:
 * - Returns 'insufficient_data' if fewer than 7 ELIGIBLE past days exist.
 * - Eligible days: past days that had at least one scheduled habit, excluding
 *   paused/excused completions and exception-covered dates.
 * - Uses only completion records; health is NEVER stored, always recomputed.
 */
export function getChallengeHealth(
  completions: HabitCompletion[],
  habits: Habit[],
  exceptions: HabitException[],
  date: string,
): ChallengeHealth {
  // Build a set of exception-covered dates per habit
  const exceptionMap = new Map<string, Set<string>>();
  for (const ex of exceptions) {
    if (!exceptionMap.has(ex.habitId)) {
      exceptionMap.set(ex.habitId, new Set());
    }
    const days = getDaysInRange(ex.startDate, ex.endDate);
    for (const d of days) {
      exceptionMap.get(ex.habitId)!.add(d);
    }
  }

  // Filter completions to eligible (non-paused, non-excused, past)
  const eligibleCompletions = completions.filter((c) => {
    if (c.date >= date) return false; // future
    if (c.status === "paused" || c.status === "excused") return false;
    const habitExceptions = exceptionMap.get(c.habitId);
    if (habitExceptions?.has(c.date)) return false;
    return true;
  });

  // Collect unique eligible dates
  const eligibleDates = [...new Set(eligibleCompletions.map((c) => c.date))].sort();

  if (eligibleDates.length < 7) {
    return {
      status: "insufficient_data",
      message: "Not enough data yet. Keep executing.",
    };
  }

  // Last 7 eligible days
  const last7 = eligibleDates.slice(-7);
  const last14 = eligibleDates.slice(-14);

  const avg7 = averageExecutionRate(eligibleCompletions, last7);
  const avg14First = averageExecutionRate(
    eligibleCompletions,
    last14.slice(0, Math.floor(last14.length / 2))
  );
  const avg14Second = averageExecutionRate(
    eligibleCompletions,
    last14.slice(Math.floor(last14.length / 2))
  );
  const trend14 = avg14Second - avg14First; // negative = declining

  // Check critical: non-negotiable misses
  const nonNegotiableIds = new Set(
    habits.filter((h) => h.isNonNegotiable).map((h) => h.id)
  );
  const recentNNMisses = eligibleCompletions.filter(
    (c) =>
      last7.includes(c.date) &&
      c.status === "missed" &&
      nonNegotiableIds.has(c.habitId)
  ).length;

  let status: HealthStatus;
  let message: string;

  if (avg7 < 50 || recentNNMisses >= 2) {
    status = "critical";
    message =
      recentNNMisses >= 2
        ? `${recentNNMisses} non-negotiable habits missed in the last 7 days.`
        : `Execution averaged ${avg7}% over the last 7 days.`;
  } else if (avg7 < 70 || trend14 <= -10) {
    status = "at_risk";
    message =
      trend14 <= -10
        ? `Execution fell ${Math.abs(Math.round(trend14))}% over the last two weeks.`
        : `Execution averaged ${avg7}% over the last 7 days.`;
  } else if (avg7 >= 85) {
    status = "strong";
    message = `${avg7}% execution over the last 7 days.`;
  } else {
    status = "steady";
    message = `${avg7}% execution over the last 7 days.`;
  }

  return { status, message };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInRange(start: string, end: string): string[] {
  const result: string[] = [];
  let current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    result.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return result;
}

/**
 * Returns the percentage of completions that are "completed" or "minimum"
 * for the given set of dates.
 */
function averageExecutionRate(
  completions: HabitCompletion[],
  dates: string[]
): number {
  if (dates.length === 0) return 0;
  const relevant = completions.filter((c) => dates.includes(c.date));
  if (relevant.length === 0) return 0;
  const passed = relevant.filter(
    (c) => c.status === "completed" || c.status === "minimum" || c.status === "partial"
  ).length;
  return Math.round((passed / relevant.length) * 100);
}
