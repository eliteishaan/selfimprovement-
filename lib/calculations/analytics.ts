import {
  type HabitCompletion,
  type FocusSession,
  type ReadingSession,
  type Task,
  type Book,
  type Goal,
  type Milestone,
  type WeeklyStats,
  type MonthlyStats,
  type FocusStats,
  type BookProgress,
} from "@/types";
import { getDateRange, getWeekStart } from "@/lib/dates";

// ─── Weekly Stats ─────────────────────────────────────────────────────────────

export function calculateWeeklyStats(
  completions: HabitCompletion[],
  focusSessions: FocusSession[],
  readingSessions: ReadingSession[],
  tasks: Task[],
  weekStart: string,
  timezone: string,
): WeeklyStats {
  const weekDates = getDateRange(weekStart, addDays(weekStart, 6));

  const weekCompletions = completions.filter((c) => weekDates.includes(c.date));
  const executed = weekCompletions.filter(
    (c) =>
      c.status === "completed" ||
      c.status === "partial" ||
      c.status === "minimum" ||
      c.status === "emergency"
  );
  const eligible = weekCompletions.filter(
    (c) => c.status !== "paused" && c.status !== "excused"
  );
  const executionPct =
    eligible.length > 0
      ? Math.round((executed.length / eligible.length) * 100)
      : 0;

  // Focus hours
  const weekFocus = focusSessions.filter((s) => {
    if (!s.endedAt) return false;
    const sessionDate = s.startedAt.slice(0, 10);
    return weekDates.includes(sessionDate);
  });
  const focusSeconds = weekFocus.reduce(
    (sum, s) => sum + (s.durationSeconds ?? 0),
    0
  );
  const focusHours = Math.round((focusSeconds / 3600) * 10) / 10;

  // Reading pages
  const weekReading = readingSessions.filter((r) => weekDates.includes(r.date));
  const readingPages = weekReading.reduce((sum, r) => sum + r.pagesRead, 0);

  // Tasks
  const weekTasks = tasks.filter(
    (t) => t.completedAt && weekDates.includes(t.completedAt.slice(0, 10))
  );

  // Best/worst day by completion rate
  const byDate = new Map<string, { executed: number; total: number }>();
  for (const d of weekDates) {
    const dayCompletions = weekCompletions.filter((c) => c.date === d);
    const dayExecuted = dayCompletions.filter(
      (c) =>
        c.status === "completed" ||
        c.status === "partial" ||
        c.status === "minimum"
    ).length;
    const dayEligible = dayCompletions.filter(
      (c) => c.status !== "paused" && c.status !== "excused"
    ).length;
    if (dayEligible > 0) {
      byDate.set(d, { executed: dayExecuted, total: dayEligible });
    }
  }

  let bestDay: string | null = null;
  let worstDay: string | null = null;
  let bestRate = -1;
  let worstRate = 101;

  for (const [d, { executed, total }] of byDate) {
    const rate = (executed / total) * 100;
    if (rate > bestRate) { bestRate = rate; bestDay = d; }
    if (rate < worstRate) { worstRate = rate; worstDay = d; }
  }

  // Habit consistency map
  const habitIds = [...new Set(weekCompletions.map((c) => c.habitId))];
  const habitConsistency: Record<string, number> = {};
  for (const hid of habitIds) {
    const hc = weekCompletions.filter((c) => c.habitId === hid);
    const he = hc.filter((c) => c.status !== "paused" && c.status !== "excused").length;
    const hx = hc.filter((c) =>
      c.status === "completed" || c.status === "partial" || c.status === "minimum"
    ).length;
    habitConsistency[hid] = he > 0 ? Math.round((hx / he) * 100) : 0;
  }

  return {
    weekStart,
    executionPct,
    focusHours,
    readingPages,
    tasksDone: weekTasks.length,
    tasksTotal: tasks.filter(
      (t) => t.plannedDate && weekDates.includes(t.plannedDate)
    ).length,
    bestDay,
    worstDay,
    habitConsistency,
  };
}

// ─── Monthly Stats ────────────────────────────────────────────────────────────

export function calculateMonthlyStats(
  completions: HabitCompletion[],
  focusSessions: FocusSession[],
  readingSessions: ReadingSession[],
  tasks: Task[],
  month: string, // YYYY-MM
): MonthlyStats {
  const [year, mon] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = `${month}-${new Date(year, mon, 0).getDate().toString().padStart(2, "0")}`;
  const dates = getDateRange(start, end);

  const mc = completions.filter((c) => dates.includes(c.date));
  const exe = mc.filter(
    (c) =>
      c.status === "completed" ||
      c.status === "partial" ||
      c.status === "minimum"
  );
  const eli = mc.filter((c) => c.status !== "paused" && c.status !== "excused");
  const avgExecution = eli.length > 0 ? Math.round((exe.length / eli.length) * 100) : 0;

  const focusSeconds = focusSessions
    .filter((s) => s.endedAt && dates.includes(s.startedAt.slice(0, 10)))
    .reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

  const readingPages = readingSessions
    .filter((r) => dates.includes(r.date))
    .reduce((sum, r) => sum + r.pagesRead, 0);

  const tasksDone = tasks.filter(
    (t) => t.completedAt && dates.includes(t.completedAt.slice(0, 10))
  ).length;

  return {
    month,
    avgExecutionPct: avgExecution,
    totalFocusHours: Math.round((focusSeconds / 3600) * 10) / 10,
    totalReadingPages: readingPages,
    totalTasksDone: tasksDone,
    avgDailyScore: avgExecution, // placeholder; use daily_scores table for real values
  };
}

// ─── Focus Stats ──────────────────────────────────────────────────────────────

export function calculateFocusStats(
  sessions: FocusSession[],
  startDate: string,
  endDate: string,
): FocusStats {
  const dates = getDateRange(startDate, endDate);
  const relevant = sessions.filter(
    (s) =>
      s.endedAt !== null && dates.includes(s.startedAt.slice(0, 10))
  );

  const totalSeconds = relevant.reduce(
    (sum, s) => sum + (s.durationSeconds ?? 0),
    0
  );
  const avgSession =
    relevant.length > 0 ? Math.round(totalSeconds / relevant.length) : 0;

  const byDate: Record<string, number> = {};
  for (const d of dates) byDate[d] = 0;
  for (const s of relevant) {
    const d = s.startedAt.slice(0, 10);
    byDate[d] = (byDate[d] ?? 0) + (s.durationSeconds ?? 0);
  }

  return {
    totalSeconds,
    sessionCount: relevant.length,
    avgSessionSeconds: avgSession,
    byDate,
  };
}

// ─── Book Progress ────────────────────────────────────────────────────────────

export function calculateBookProgress(
  book: Book,
  sessions: ReadingSession[],
): BookProgress {
  const total = book.totalPages ?? 0;
  const current = book.currentPage;
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  if (sessions.length === 0) {
    return { pct, pacePerDay: 0, estimatedDaysLeft: null };
  }

  // Average pages per day over last 7 sessions
  const recent = [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);
  const totalPages = recent.reduce((sum, s) => sum + s.pagesRead, 0);
  const pacePerDay = Math.round(totalPages / recent.length);

  const remaining = total - current;
  const estimatedDaysLeft =
    pacePerDay > 0 ? Math.ceil(remaining / pacePerDay) : null;

  return { pct, pacePerDay, estimatedDaysLeft };
}

// ─── Goal Progress ────────────────────────────────────────────────────────────

export function calculateGoalProgress(
  goal: Goal,
  milestones: Milestone[],
): number {
  // If numeric, use current/target
  if (goal.numericTarget && parseFloat(goal.numericTarget) > 0) {
    return Math.min(
      100,
      Math.round(
        (parseFloat(goal.currentValue) / parseFloat(goal.numericTarget)) * 100
      )
    );
  }
  // Otherwise derive from milestone completion
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.status === "completed").length;
  return Math.round((done / milestones.length) * 100);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
