import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentChallenge } from "@/app/actions/challenges";
import { Plus, Target } from "lucide-react";
import { db } from "@/lib/db";
import { habits, habitSchedules } from "@/lib/db/schema";
import { eq, desc, asc, inArray } from "drizzle-orm";
import type { Habit, HabitSchedule } from "@/types";

export const metadata = { title: "Habits" };

export default async function HabitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const challenge = await getCurrentChallenge();

  const habitsList = await db
    .select()
    .from(habits)
    .where(eq(habits.userId, user.id))
    .orderBy(desc(habits.isNonNegotiable), asc(habits.createdAt));

  const habitIds = habitsList.map((h) => h.id);
  const schedulesList = habitIds.length > 0
    ? await db
        .select()
        .from(habitSchedules)
        .where(inArray(habitSchedules.habitId, habitIds))
    : [];

  const habitsWithSchedules = habitsList.map((h) => ({
    ...h,
    schedule: schedulesList.find((s) => s.habitId === h.id) ?? null,
  }));

  const active = habitsWithSchedules.filter((h) => h.isActive);
  const inactive = habitsWithSchedules.filter((h) => !h.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>HABITS</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {active.length} active
          </p>
        </div>
        <Link href="/habits/new" className="btn btn-primary text-xs gap-1.5">
          <Plus size={12} /> NEW
        </Link>
      </div>

      {habitsWithSchedules.length === 0 && (
        <div className="py-16 text-center">
          <Target size={32} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>No habits configured.</p>
          <Link href="/habits/new" className="btn btn-primary text-sm px-6 inline-flex">
            Create your first habit
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-0.5">
          {active.map((h) => <HabitRow key={h.id} habit={h} />)}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="mt-8">
          <p className="section-header">INACTIVE</p>
          <div className="space-y-0.5">
            {inactive.map((h) => <HabitRow key={h.id} habit={h} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function HabitRow({ habit }: { habit: any }) {
  const schedule = habit.schedule;
  const freq = schedule?.frequencyType;
  
  const freqLabel = 
    freq === "daily" ? "Daily" :
    freq === "specific_days" ? "Specific days" :
    freq === "x_per_week" ? `${schedule?.timesPerWeek}x/week` :
    freq === "weekly_quantity" ? "Weekly target" : "Custom";

  return (
    <Link
      href={`/habits/${habit.id}`}
      className="card flex items-center justify-between px-4 py-3 interactive-row block"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {habit.title}
          {habit.isNonNegotiable && (
            <span className="ml-1.5 text-[9px] font-semibold" style={{ color: "var(--accent-dim)" }}>★</span>
          )}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
          {freqLabel}
          {habit.behavior === "quantity" && habit.targetValue && ` · ${habit.targetValue} ${habit.unit}`}
          {habit.behavior === "duration" && habit.targetValue && ` · ${habit.targetValue} mins`}
        </p>
      </div>
    </Link>
  );
}
