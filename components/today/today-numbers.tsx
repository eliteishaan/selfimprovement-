"use client";

import type { ExecutionScoreResult, Habit, HabitCompletion, HabitSchedule, Task } from "@/types";
import { formatDuration } from "@/lib/dates";

interface TodayNumbersProps {
  executionScore: ExecutionScoreResult | null;
  outcomeProgress: number | null;
  habits: Array<Habit & { completion: HabitCompletion | null; schedule: HabitSchedule | null }>;
  tasks: Task[];
  todayFocusSeconds: number;
  todayReadingPages: number;
}

export default function TodayNumbers({
  executionScore,
  outcomeProgress,
  habits,
  tasks,
  todayFocusSeconds,
  todayReadingPages,
}: TodayNumbersProps) {
  const completedHabits = habits.filter(
    (h) =>
      h.completion?.status === "completed" ||
      h.completion?.status === "minimum" ||
      h.completion?.status === "partial"
  ).length;
  const totalHabits = habits.length;

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;

  const exec = executionScore?.score ?? null;
  const outcome = outcomeProgress ?? null;

  return (
    <div className="space-y-4">
      {/* Main scores */}
      <div className="grid grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
        <ScoreBlock
          label="EXECUTION"
          value={exec !== null ? `${exec}%` : "—"}
          sub="Did you execute?"
          highlight={exec !== null && exec >= 80}
          warn={exec !== null && exec < 60}
        />
        <ScoreBlock
          label="OUTCOME"
          value={outcome !== null ? `${outcome}%` : "—"}
          sub="Goals advancing?"
          highlight={false}
          warn={false}
        />
      </div>

      {/* Detail row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatItem label="HABITS" value={`${completedHabits} / ${totalHabits}`} />
        <StatItem label="FOCUS" value={todayFocusSeconds > 0 ? formatDuration(todayFocusSeconds) : "—"} />
        <StatItem label="TASKS" value={totalTasks > 0 ? `${completedTasks} / ${totalTasks}` : "—"} />
        <StatItem label="READING" value={todayReadingPages > 0 ? `${todayReadingPages} pages` : "—"} />
      </div>
    </div>
  );
}

function ScoreBlock({
  label,
  value,
  sub,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  sub: string;
  highlight: boolean;
  warn: boolean;
}) {
  return (
    <div
      className="px-4 py-4"
      style={{ background: "var(--bg-surface)" }}
    >
      <p className="label mb-2">{label}</p>
      <p
        className="text-score"
        style={{
          color: highlight
            ? "var(--success)"
            : warn
            ? "var(--danger)"
            : "var(--text-primary)",
        }}
      >
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {sub}
      </p>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-3">
      <p className="label mb-1">{label}</p>
      <p className="text-data text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
