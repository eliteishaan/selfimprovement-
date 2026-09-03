"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ChallengeContext,
  Habit,
  HabitCompletion,
  HabitSchedule,
  Task,
  FocusSession,
  DailyNote,
  ExecutionScoreResult,
} from "@/types";
import ChallengeBanner from "./challenge-banner";
import MissionList from "./mission-list";
import FocusWidget from "./focus-widget";
import TodayNumbers from "./today-numbers";
import TopPriorityCard from "./top-priority-card";
import NightlyShutdown from "./nightly-shutdown";
import MorningBriefing from "./morning-briefing";

interface TodayDashboardProps {
  challengeContext: ChallengeContext;
  habits: Array<Habit & { schedule: HabitSchedule | null; completion: HabitCompletion | null }>;
  tomorrowHabits?: Array<Habit & { schedule: HabitSchedule | null; completion: HabitCompletion | null }>;
  tomorrowDate?: string;
  tasks: Task[];
  topPriorityTask: Task | null;
  activeSession: FocusSession | null;
  todayFocusSeconds: number;
  todayReadingPages: number;
  executionScore: ExecutionScoreResult | null;
  outcomeProgress: number | null;
  dailyNote: DailyNote | null;
  date: string;
  timezone: string;
  userId: string;
  displayName?: string | null;
}

export default function TodayDashboard(props: TodayDashboardProps) {
  const {
    challengeContext,
    habits,
    tomorrowHabits,
    tomorrowDate,
    tasks,
    topPriorityTask,
    activeSession,
    todayFocusSeconds,
    todayReadingPages,
    executionScore,
    outcomeProgress,
    dailyNote,
    date,
    timezone,
    userId,
    displayName,
  } = props;

  const hour = new Date().getHours();
  const showMorningBriefing = hour < 12 && !habits.some((h) => h.completion?.status === "completed");
  const showNightlyShutdown = hour >= 19 && !dailyNote?.completedHonestly;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-6"
    >
      {/* Morning briefing */}
      {showMorningBriefing && (
        <MorningBriefing
          challengeContext={challengeContext}
          habits={habits}
          date={date}
          displayName={displayName}
        />
      )}

      {/* Challenge banner: NAME / DAY X / HEALTH / TIME% */}
      <ChallengeBanner context={challengeContext} />

      {/* Mission list */}
      <section>
        <p className="section-header">TODAY&apos;S MISSION</p>
        <MissionList habits={habits} date={date} userId={userId} />
      </section>

      {/* Tomorrow's preview */}
      {tomorrowHabits && tomorrowHabits.length > 0 && tomorrowDate && (
        <section className="opacity-60 grayscale-[20%] transition-opacity hover:opacity-100 hover:grayscale-0">
          <div className="flex items-center justify-between mb-2">
            <p className="section-header !mb-0">TOMORROW&apos;S MISSION</p>
            <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              PREVIEW
            </span>
          </div>
          <MissionList habits={tomorrowHabits} date={tomorrowDate} userId={userId} readOnly={true} />
        </section>
      )}

      {/* Focus widget */}
      <section>
        <p className="section-header">FOCUS</p>
        <FocusWidget
          activeSession={activeSession}
          todaySeconds={todayFocusSeconds}
          challengeId={challengeContext.challenge.id}
          userId={userId}
        />
      </section>

      {/* Today's numbers: EXECUTION | OUTCOME */}
      <TodayNumbers
        executionScore={executionScore}
        outcomeProgress={outcomeProgress}
        habits={habits}
        tasks={tasks}
        todayFocusSeconds={todayFocusSeconds}
        todayReadingPages={todayReadingPages}
      />

      {/* Top priority */}
      {topPriorityTask && (
        <section>
          <p className="section-header">TOP PRIORITY</p>
          <TopPriorityCard task={topPriorityTask} userId={userId} />
        </section>
      )}

      {/* Nightly shutdown */}
      {showNightlyShutdown && (
        <section>
          <p className="section-header">END OF DAY</p>
          <NightlyShutdown
            date={date}
            habits={habits}
            tasks={tasks}
            todayFocusSeconds={todayFocusSeconds}
            todayReadingPages={todayReadingPages}
            existingNote={dailyNote}
          />
        </section>
      )}
    </motion.div>
  );
}
