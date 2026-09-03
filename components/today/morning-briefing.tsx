"use client";

import type { ChallengeContext, Habit, HabitCompletion, HabitSchedule } from "@/types";

interface MorningBriefingProps {
  challengeContext: ChallengeContext;
  habits: Array<Habit & { schedule: HabitSchedule | null; completion: HabitCompletion | null }>;
  date: string;
  displayName?: string | null;
}

export default function MorningBriefing({
  challengeContext,
  habits,
  date,
  displayName,
}: MorningBriefingProps) {
  const { challenge, day, daysRemaining, currentPhase } = challengeContext;
  const nonNegotiables = habits.filter((h) => h.isNonNegotiable).length;
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Early start" : hour < 12 ? "Good morning" : "Good afternoon";

  return (
    <div
      className="px-4 py-5 rounded-sm border-l-2"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--accent-dim)",
        borderTop: "1px solid var(--border)",
        borderRight: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <p className="text-xs font-medium mb-3" style={{ color: "var(--accent)" }}>
        {greeting.toUpperCase()}{displayName ? `, ${displayName.split(" ")[0].toUpperCase()}` : ""}
      </p>

      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Challenge</span>
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            Day {day} of {
              Math.ceil((new Date(challenge.endDate).getTime() - new Date(challenge.startDate).getTime()) / 86400000) + 1
            }
          </span>
        </div>

        {currentPhase && (
          <div className="flex justify-between items-baseline">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Phase</span>
            <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              {currentPhase.name}
            </span>
          </div>
        )}

        {nonNegotiables > 0 && (
          <div className="flex justify-between items-baseline">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Non-negotiables</span>
            <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              {nonNegotiables}
            </span>
          </div>
        )}

        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Days remaining</span>
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            {daysRemaining}
          </span>
        </div>
      </div>

      {challenge.objective && (
        <p className="mt-3 pt-3 text-xs border-t" style={{
          color: "var(--text-secondary)",
          borderColor: "var(--border)"
        }}>
          {challenge.objective}
        </p>
      )}
    </div>
  );
}
