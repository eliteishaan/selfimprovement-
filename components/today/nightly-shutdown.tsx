"use client";

import { useState, useTransition } from "react";
import type { DailyNote, Habit, HabitCompletion, HabitSchedule, Task } from "@/types";
import { upsertDailyNote } from "@/app/actions/reviews";
import { formatDuration } from "@/lib/dates";

interface NightlyShutdownProps {
  date: string;
  habits: Array<Habit & { completion: HabitCompletion | null; schedule: HabitSchedule | null }>;
  tasks: Task[];
  todayFocusSeconds: number;
  todayReadingPages: number;
  existingNote: DailyNote | null;
}

export default function NightlyShutdown({
  date,
  habits,
  tasks,
  todayFocusSeconds,
  todayReadingPages,
  existingNote,
}: NightlyShutdownProps) {
  const [whatWentWell, setWell] = useState(existingNote?.whatWentWell ?? "");
  const [whatWentWrong, setWrong] = useState(existingNote?.whatWentWrong ?? "");
  const [tomorrowPriority, setTomorrow] = useState(existingNote?.tomorrowPriority ?? "");
  const [completedHonestly, setHonestly] = useState<boolean | null>(existingNote?.completedHonestly ?? null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const executedHabits = habits.filter(
    (h) =>
      h.completion?.status === "completed" ||
      h.completion?.status === "minimum" ||
      h.completion?.status === "partial"
  ).length;
  const missedHabits = habits.filter((h) => h.completion?.status === "missed").length;

  function handleSave() {
    startTransition(async () => {
      await upsertDailyNote({
        date,
        whatWentWell: whatWentWell || null,
        whatWentWrong: whatWentWrong || null,
        tomorrowPriority: tomorrowPriority || null,
        completedHonestly,
      });
      setSaved(true);
    });
  }

  if (saved) {
    return (
      <div className="card px-4 py-4 text-center">
        <p className="text-xs font-semibold tracking-widest" style={{ color: "var(--success)" }}>
          SHUTDOWN COMPLETE
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Rest. Tomorrow continues.</p>
      </div>
    );
  }

  return (
    <div className="card px-4 py-5 space-y-5">
      {/* Day summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCell label="HABITS" value={`${executedHabits} / ${habits.length}`} />
        <SummaryCell label="FOCUS" value={todayFocusSeconds > 0 ? formatDuration(todayFocusSeconds) : "—"} />
        <SummaryCell label="PAGES" value={todayReadingPages > 0 ? String(todayReadingPages) : "—"} />
      </div>

      {missedHabits > 0 && (
        <div
          className="px-3 py-2 text-xs rounded-sm"
          style={{ background: "var(--danger-subtle)", color: "var(--danger)", border: "1px solid var(--danger)" }}
        >
          {missedHabits} habit{missedHabits > 1 ? "s" : ""} missed today.
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            What went well?
          </label>
          <textarea
            value={whatWentWell}
            onChange={(e) => setWell(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm resize-none"
            placeholder="One thing that worked..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            What needs to improve?
          </label>
          <textarea
            value={whatWentWrong}
            onChange={(e) => setWrong(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm resize-none"
            placeholder="One thing to fix..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Tomorrow&apos;s top priority
          </label>
          <input
            type="text"
            value={tomorrowPriority}
            onChange={(e) => setTomorrow(e.target.value)}
            className="w-full px-3 py-2 text-sm"
            placeholder="The one thing that matters most..."
          />
        </div>

        {/* Honest completion toggle */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Did you complete today honestly?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setHonestly(true)}
              className="btn text-xs flex-1"
              style={{
                background: completedHonestly === true ? "var(--success-subtle)" : "transparent",
                borderColor: completedHonestly === true ? "var(--success)" : "var(--border)",
                color: completedHonestly === true ? "var(--success)" : "var(--text-muted)",
                border: "1px solid",
              }}
            >
              YES
            </button>
            <button
              onClick={() => setHonestly(false)}
              className="btn text-xs flex-1"
              style={{
                background: completedHonestly === false ? "var(--danger-subtle)" : "transparent",
                borderColor: completedHonestly === false ? "var(--danger)" : "var(--border)",
                color: completedHonestly === false ? "var(--danger)" : "var(--text-muted)",
                border: "1px solid",
              }}
            >
              NO
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="btn btn-primary w-full text-sm py-2.5"
      >
        {isPending ? "Saving..." : "Complete Today"}
      </button>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center py-2 border rounded-sm" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
      <p className="label">{label}</p>
      <p className="text-data text-sm font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
