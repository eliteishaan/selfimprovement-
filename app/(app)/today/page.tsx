import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocalDate, getWeekStart, getYesterday } from "@/lib/dates";
import { getChallengeDay, getDaysRemaining, getChallengeTimeProgress, getCurrentPhase, getChallengeHealth } from "@/lib/calculations/challenge";
import { calculateExecutionScore, calculateOutcomeProgress } from "@/lib/calculations/score";
import { getCurrentChallenge } from "@/app/actions/challenges";
import { getActiveSession, getTodayFocusSeconds } from "@/app/actions/focus";
import { getTodayReadingPages } from "@/app/actions/books";
import NoActiveChallenge from "@/components/today/no-active-challenge";
import TodayDashboard from "@/components/today/today-dashboard";
import type { ChallengeContext, Habit, HabitSchedule, HabitCompletion, Task, HabitException } from "@/types";
import { db } from "@/lib/db";
import { habits, habitSchedules, habitCompletions, habitExceptions, tasks, goals, challengePhases, dailyNotes } from "@/lib/db/schema";
import { eq, and, inArray, gte, lte, desc, asc } from "drizzle-orm";
import { isHabitScheduledForDate } from "@/lib/calculations/habits";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's timezone
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, display_name")
    .eq("id", user.id)
    .single();

  const timezone = profile?.timezone ?? "UTC";
  const today = getLocalDate(timezone);
  const weekStart = getWeekStart(today, timezone);
  const yesterday = getYesterday(today);

  // Calculate tomorrow's date string
  const todayDateObj = new Date(today);
  todayDateObj.setDate(todayDateObj.getDate() + 1);
  const tomorrow = todayDateObj.toISOString().slice(0, 10);

  // Check for active challenge — first-class empty state
  const challenge = await getCurrentChallenge();
  if (!challenge) {
    return <NoActiveChallenge displayName={profile?.display_name} />;
  }

  // Fetch habits via Drizzle
  const habitsList = await db.select().from(habits).where(and(
    eq(habits.userId, user.id),
    eq(habits.challengeId, challenge.id),
    eq(habits.isActive, true)
  ));

  const habitIds = habitsList.map((h) => h.id);

  // Parallel data fetching via Drizzle + existing actions
  const [
    schedulesList,
    todayTasks,
    activeSession,
    todayFocusSeconds,
    todayReadingPages,
    goalsList,
    phasesList,
    exceptionsList,
    todayCompletions,
    allCompletions,
    dailyNoteRec,
  ] = await Promise.all([
    habitIds.length > 0 ? db.select().from(habitSchedules).where(inArray(habitSchedules.habitId, habitIds)) : Promise.resolve([]),
    db.select().from(tasks).where(and(eq(tasks.userId, user.id), inArray(tasks.status, ["today", "in_progress"]))).orderBy(desc(tasks.isTopPriority), asc(tasks.priority)),
    getActiveSession(),
    getTodayFocusSeconds(today),
    getTodayReadingPages(today),
    db.select().from(goals).where(and(eq(goals.userId, user.id), eq(goals.challengeId, challenge.id), eq(goals.status, "active"))),
    db.select().from(challengePhases).where(eq(challengePhases.challengeId, challenge.id)).orderBy(asc(challengePhases.orderIndex)),
    habitIds.length > 0 ? db.select().from(habitExceptions).where(inArray(habitExceptions.habitId, habitIds)) : Promise.resolve([]),
    db.select().from(habitCompletions).where(and(eq(habitCompletions.userId, user.id), eq(habitCompletions.date, today))),
    db.select().from(habitCompletions).where(and(eq(habitCompletions.userId, user.id), gte(habitCompletions.date, challenge.startDate), lte(habitCompletions.date, today))),
    db.select().from(dailyNotes).where(and(eq(dailyNotes.userId, user.id), eq(dailyNotes.date, today))).limit(1),
  ]);

  const dailyNote = dailyNoteRec[0] ?? null;

  // Build enriched habit list for today
  const enrichedHabits = habitsList.map((h) => {
    const schedule = schedulesList.find((s) => s.habitId === h.id);
    return {
      ...h,
      schedule,
      completion: todayCompletions.find((c) => c.habitId === h.id) ?? null,
    };
  });

  // Filter habits for today
  const todayHabits = enrichedHabits.filter(h => {
    if (!h.schedule) return false;
    if (today < h.schedule.effectiveFrom) return false;
    return isHabitScheduledForDate(h.schedule as any, today);
  });

  // Filter habits for tomorrow
  const tomorrowHabits = enrichedHabits.filter(h => {
    if (!h.schedule) return false;
    if (tomorrow < h.schedule.effectiveFrom) return false;
    return isHabitScheduledForDate(h.schedule as any, tomorrow);
  }).map(h => ({
    ...h,
    completion: null // Tomorrow hasn't happened yet
  }));

  // Build schedules map and exceptions map for score calculation
  const schedulesMap = new Map(schedulesList.map((s) => [s.habitId, s as any]));
  const exceptionsMap = new Map<string, any[]>(
    habitIds.map((id) => [
      id,
      exceptionsList.filter((e) => e.habitId === id) as any[],
    ])
  );

  // Execution score
  const scoreResult = calculateExecutionScore(
    habitsList as any[],
    schedulesMap,
    todayCompletions as any[],
    exceptionsMap,
    todayTasks as any[],
    activeSession ? [] : [], // active session not counted
    today,
    timezone,
    challenge.scoreWeights,
    undefined, // focus target — use challenge default
    undefined, // reading target
    todayReadingPages
  );

  // Outcome progress
  const outcomeProgress = calculateOutcomeProgress(goalsList as any);

  // Challenge context
  const currentPhase = getCurrentPhase(challenge as any, phasesList as any, today);
  const health = getChallengeHealth(
    allCompletions as any,
    habitsList as any,
    exceptionsList as any,
    today
  );
  const challengeContext: ChallengeContext = {
    challenge: challenge as any,
    phases: phasesList as any,
    currentPhase,
    day: getChallengeDay(challenge as any, today),
    daysRemaining: getDaysRemaining(challenge as any, today),
    timeProgress: getChallengeTimeProgress(challenge as any, today),
    health,
  };

  // Top priority task
  const topPriorityTask =
    todayTasks.find((t) => t.isTopPriority) ??
    todayTasks[0] ??
    null;

  return (
    <TodayDashboard
      challengeContext={challengeContext}
      habits={todayHabits as any}
      tomorrowHabits={tomorrowHabits as any}
      tomorrowDate={tomorrow}
      tasks={todayTasks as any[]}
      topPriorityTask={topPriorityTask as any}
      activeSession={activeSession as any}
      todayFocusSeconds={todayFocusSeconds}
      todayReadingPages={todayReadingPages}
      executionScore={scoreResult}
      outcomeProgress={outcomeProgress}
      dailyNote={dailyNote as any}
      date={today}
      timezone={timezone}
      userId={user.id}
      displayName={profile?.display_name}
    />
  );
}
