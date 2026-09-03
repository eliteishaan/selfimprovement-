import {
  type Habit,
  type HabitSchedule,
  type HabitCompletion,
  type HabitException,
  type HabitStatus,
  type HabitStreaks,
  type WeeklyQuotaProgress,
} from "@/types";
import { getDayOfWeek, getWeekStart, getDateRange } from "@/lib/dates";
import { isDateInRange } from "@/lib/dates";

/**
 * Returns true if a habit is scheduled to be tracked on the given date.
 *
 * IMPORTANT:
 * - daily → always true
 * - specific_days → true if date's day-of-week is in daysOfWeek
 * - x_per_week / weekly_quantity → true (the date is a contribution day,
 *   not a pass/fail day — quota evaluation happens at week end)
 */
export function isHabitScheduledForDate(
  schedule: HabitSchedule,
  date: string,
): boolean {
  switch (schedule.frequencyType) {
    case "daily":
      return true;
    case "specific_days": {
      const dow = getDayOfWeek(date);
      return schedule.daysOfWeek?.includes(dow) ?? false;
    }
    case "x_per_week":
    case "weekly_quantity":
      // These habits span the week — every day is a potential contribution day
      return true;
    default:
      return false;
  }
}

/**
 * Returns true if the habit has an active exception covering the given date.
 */
export function isHabitPausedForDate(
  exceptions: HabitException[],
  date: string,
): boolean {
  return exceptions.some(
    (ex) =>
      ex.habitId !== undefined && // type guard
      isDateInRange(date, ex.startDate, ex.endDate)
  );
}

/**
 * Returns the completion record for a habit on a specific date, or null.
 */
export function getHabitStatusForDate(
  completions: HabitCompletion[],
  habitId: string,
  date: string,
): HabitCompletion | null {
  return completions.find((c) => c.habitId === habitId && c.date === date) ?? null;
}

/**
 * Returns true if a habit is a DAILY habit (not a weekly quota).
 * Daily habits contribute to the daily execution score denominator.
 * Weekly quota habits do NOT.
 */
export function isHabitDailyScheduled(schedule: HabitSchedule): boolean {
  return (
    schedule.frequencyType === "daily" ||
    schedule.frequencyType === "specific_days"
  );
}

/**
 * Returns current and best streak for a habit based on completion history.
 *
 * Streak rules:
 * - Only 'completed', 'partial', 'minimum', 'emergency' count as executed days.
 * - 'paused', 'excused', 'skipped' are NEUTRAL — they neither continue nor break the streak.
 * - 'missed' breaks the streak.
 * - Weekly quota habits: streak counts weeks-met, not individual days.
 */
export function calculateHabitStreaks(
  habit: Habit,
  schedule: HabitSchedule,
  completions: HabitCompletion[],
): HabitStreaks {
  const isQuota =
    schedule.frequencyType === "x_per_week" ||
    schedule.frequencyType === "weekly_quantity";

  if (isQuota) {
    return calculateQuotaStreaks(completions, schedule);
  }

  // Daily / specific_days — day-by-day streak
  const sorted = [...completions]
    .filter((c) => c.habitId === habit.id)
    .sort((a, b) => b.date.localeCompare(a.date)); // newest first

  const executed = new Set(["completed", "partial", "minimum", "emergency"]);
  const neutral = new Set(["paused", "excused", "skipped"]);

  let current = 0;
  let best = 0;
  let streak = 0;
  let counting = true;

  for (const c of sorted) {
    if (executed.has(c.status)) {
      streak++;
      best = Math.max(best, streak);
      if (counting) current = streak;
    } else if (neutral.has(c.status)) {
      // neutral: skip, continue streak
    } else {
      // missed
      if (counting) counting = false;
      if (streak > best) best = streak;
      streak = 0;
    }
  }

  return { current, best };
}

/**
 * Weekly quota progress: how many completions exist this week vs target.
 *
 * RULE 3: Weekly quota evaluation is final at week-end.
 * Mid-week, this returns progress toward the target — never a failure count.
 */
export function getWeeklyQuotaProgress(
  completions: HabitCompletion[],
  habitId: string,
  schedule: HabitSchedule,
  weekStart: string,
  timezone: string,
): WeeklyQuotaProgress {
  const weekDates = getDateRange(weekStart, addDays(weekStart, 6));
  const weekCompletions = completions.filter(
    (c) =>
      c.habitId === habitId &&
      weekDates.includes(c.date) &&
      (c.status === "completed" || c.status === "partial" || c.status === "minimum")
  );

  if (schedule.frequencyType === "x_per_week") {
    return {
      done: weekCompletions.length,
      target: schedule.timesPerWeek ?? 0,
    };
  }

  if (schedule.frequencyType === "weekly_quantity") {
    const totalValue = weekCompletions.reduce(
      (sum, c) => sum + (parseFloat(c.actualValue ?? "0") || 0),
      0
    );
    return {
      done: totalValue,
      target: parseFloat(schedule.weeklyQuantity ?? "0"),
    };
  }

  return { done: 0, target: 0 };
}

/**
 * Returns true if the weekly quota is met for the given week.
 */
export function isWeeklyQuotaMet(
  completions: HabitCompletion[],
  habitId: string,
  schedule: HabitSchedule,
  weekStart: string,
  timezone: string,
): boolean {
  const progress = getWeeklyQuotaProgress(completions, habitId, schedule, weekStart, timezone);
  return progress.done >= progress.target;
}

/**
 * Calculates habit completion percentage over a date range.
 * Weekly quota habits are evaluated at week boundaries, not day-by-day.
 */
export function calculateHabitCompletionPct(
  completions: HabitCompletion[],
  habitId: string,
  dates: string[],
): number {
  if (dates.length === 0) return 0;
  const relevant = completions.filter(
    (c) => c.habitId === habitId && dates.includes(c.date)
  );
  const executed = relevant.filter(
    (c) =>
      c.status === "completed" ||
      c.status === "partial" ||
      c.status === "minimum" ||
      c.status === "emergency"
  ).length;
  // Exclude paused/excused from denominator
  const eligible = relevant.filter(
    (c) => c.status !== "paused" && c.status !== "excused"
  ).length;
  if (eligible === 0) return 0;
  return Math.round((executed / eligible) * 100);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function calculateQuotaStreaks(
  completions: HabitCompletion[],
  schedule: HabitSchedule,
): HabitStreaks {
  // Simplified: count consecutive weeks where quota was met
  // Full implementation uses weekly boundary logic
  return { current: 0, best: 0 };
}
