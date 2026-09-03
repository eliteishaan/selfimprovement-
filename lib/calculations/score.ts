import {
  type Habit,
  type HabitSchedule,
  type HabitCompletion,
  type HabitException,
  type Task,
  type FocusSession,
  type Goal,
  type ScoreWeights,
  type ExecutionScoreResult,
} from "@/types";
import { isHabitDailyScheduled, isHabitPausedForDate } from "./habits";

/**
 * Calculates the Execution Score for a given date.
 *
 * Architecture rules:
 * 1. Only DAILY-SCHEDULED habits (daily | specific_days) count in the daily denominator.
 * 2. Weekly quota habits (x_per_week | weekly_quantity) are EXCLUDED from individual
 *    daily scores. They are evaluated at week-end, not mid-week.
 * 3. Paused/excused habits are excluded from denominator.
 * 4. Returns weightsUsed so it can be stored in the daily_scores snapshot.
 */
export function calculateExecutionScore(
  habits: Habit[],
  schedules: Map<string, HabitSchedule>,
  completions: HabitCompletion[],
  exceptions: Map<string, HabitException[]>,
  tasks: Task[],
  focusSessions: FocusSession[],
  date: string,
  timezone: string,
  weights: ScoreWeights,
  focusTargetSeconds?: number,
  readingTargetPages?: number,
  todayReadingPages?: number,
): ExecutionScoreResult {
  // ── Habits component ────────────────────────────────────────────────────────
  const dailyHabits = habits.filter((h) => {
    const schedule = schedules.get(h.id);
    if (!schedule) return false;
    return isHabitDailyScheduled(schedule);
  });

  let habitsNum = 0;
  let habitsDen = 0;

  for (const habit of dailyHabits) {
    const habitExceptions = exceptions.get(habit.id) ?? [];
    if (isHabitPausedForDate(habitExceptions, date)) continue; // exclude paused

    const completion = completions.find(
      (c) => c.habitId === habit.id && c.date === date
    );
    habitsDen++;

    if (!completion || completion.status === "missed") {
      // 0 points
    } else if (
      completion.status === "completed" ||
      completion.status === "emergency"
    ) {
      habitsNum += 1.0;
    } else if (
      completion.status === "minimum" ||
      completion.status === "partial"
    ) {
      habitsNum += 0.5;
    } else if (
      completion.status === "skipped" ||
      completion.status === "excused"
    ) {
      habitsDen--; // neutral — don't penalise
    }
  }

  const habitsScore = habitsDen > 0 ? (habitsNum / habitsDen) * 100 : 100;

  // ── Focus component ─────────────────────────────────────────────────────────
  const todayFocusSeconds = focusSessions
    .filter((s) => s.endedAt !== null) // only completed sessions
    .reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

  const target = focusTargetSeconds ?? 3 * 3600; // default 3h
  const focusScore = Math.min(100, (todayFocusSeconds / target) * 100);

  // ── Tasks component ─────────────────────────────────────────────────────────
  const todayTasks = tasks.filter(
    (t) => t.status === "today" || t.status === "in_progress" || t.dueDate === date
  );
  const completedTasks = todayTasks.filter((t) => t.status === "completed").length;
  const tasksScore =
    todayTasks.length > 0 ? (completedTasks / todayTasks.length) * 100 : 100;

  // ── Reading component ────────────────────────────────────────────────────────
  const readingPages = todayReadingPages ?? 0;
  const readingTarget = readingTargetPages ?? 20;
  const readingScore = Math.min(100, (readingPages / readingTarget) * 100);

  // ── Weighted total ───────────────────────────────────────────────────────────
  const totalWeight =
    weights.habits + weights.focus + weights.tasks + weights.reading;
  const score =
    (habitsScore * weights.habits +
      focusScore * weights.focus +
      tasksScore * weights.tasks +
      readingScore * weights.reading) /
    totalWeight;

  return {
    score: Math.round(score),
    breakdown: {
      habits: Math.round(habitsScore),
      focus: Math.round(focusScore),
      tasks: Math.round(tasksScore),
      reading: Math.round(readingScore),
    },
    weightsUsed: weights,
  };
}

/**
 * Calculates Outcome Progress: weighted average of goal progress.
 * Goals without a numeric_target are excluded from the calculation.
 * This is SEPARATE from Execution Score — never merged.
 */
export function calculateOutcomeProgress(goals: Goal[]): number {
  const measurable = goals.filter(
    (g) =>
      g.status === "active" &&
      g.numericTarget !== null &&
      parseFloat(g.numericTarget) > 0
  );
  if (measurable.length === 0) return 0;

  const totalPct = measurable.reduce((sum, g) => {
    const current = parseFloat(g.currentValue);
    const target = parseFloat(g.numericTarget!);
    return sum + Math.min(100, (current / target) * 100);
  }, 0);

  return Math.round(totalPct / measurable.length);
}

/**
 * Returns true if yesterday had at least one missed habit.
 */
export function wasYesterdayMissed(
  completions: HabitCompletion[],
  yesterday: string,
): boolean {
  return completions.some(
    (c) => c.date === yesterday && c.status === "missed"
  );
}

/**
 * Returns true if today is a "recovery day":
 * - yesterday had at least one missed habit
 * - today has at least one completed habit
 */
export function isRecoveryDay(
  completions: HabitCompletion[],
  yesterday: string,
  today: string,
): boolean {
  const hadMiss = wasYesterdayMissed(completions, yesterday);
  const hasCompletion = completions.some(
    (c) =>
      c.date === today &&
      (c.status === "completed" || c.status === "minimum" || c.status === "partial")
  );
  return hadMiss && hasCompletion;
}
