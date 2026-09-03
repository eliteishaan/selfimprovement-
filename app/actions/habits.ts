"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { habits, habitSchedules, habitCompletions, habitExceptions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  CreateHabitSchema,
  RecordCompletionSchema,
  CreateExceptionSchema,
} from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// ─── Get today's habits ───────────────────────────────────────────────────────

export async function getTodaysHabits(challengeId: string | null, date: string) {
  const user = await getUser();
  const supabase = await createClient();

  // Get all active habits for this user (optionally filtered to challenge)
  const query = supabase
    .from("habits")
    .select(`
      *,
      habit_schedules(*),
      habit_completions(*)
    `)
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (challengeId) {
    query.eq("challenge_id", challengeId);
  }

  const { data } = await query;
  if (!data) return [];

  // Filter completions to today only
  return data.map((h: any) => ({
    ...h,
    schedule: h.habit_schedules?.[0] ?? null,
    completion:
      h.habit_completions?.find((c: any) => c.date === date) ?? null,
  }));
}

// ─── Create habit ─────────────────────────────────────────────────────────────

export async function createHabit(data: unknown) {
  const user = await getUser();
  const parsed = CreateHabitSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const {
    frequencyType,
    daysOfWeek,
    timesPerWeek,
    weeklyQuantity,
    effectiveFrom,
    challengeId,
    ...habitData
  } = parsed.data;

  const [habit] = await db
    .insert(habits)
    .values({ ...habitData, userId: user.id, challengeId: challengeId ?? null })
    .returning();

  await db.insert(habitSchedules).values({
    habitId: habit.id,
    frequencyType,
    daysOfWeek: daysOfWeek ?? null,
    timesPerWeek: timesPerWeek ?? null,
    weeklyQuantity: weeklyQuantity ?? null,
    effectiveFrom,
  });

  revalidatePath("/today");
  revalidatePath("/habits");
  return { habit };
}

// ─── Record completion ────────────────────────────────────────────────────────
// This is the most-used server action in the entire app.

export async function recordCompletion(data: unknown) {
  const user = await getUser();
  const parsed = RecordCompletionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Verify habit ownership
  const [habit] = await db
    .select({ userId: habits.userId })
    .from(habits)
    .where(and(eq(habits.id, parsed.data.habitId), eq(habits.userId, user.id)))
    .limit(1);

  if (!habit) return { error: "Not found" };

  // Upsert completion (one row per habit per date — UNIQUE constraint)
  const supabase = await createClient();
  const { data: completion, error } = await supabase
    .from("habit_completions")
    .upsert(
      {
        habit_id: parsed.data.habitId,
        user_id: user.id,
        date: parsed.data.date,
        status: parsed.data.status,
        actual_value: parsed.data.actualValue ?? null,
        note: parsed.data.note ?? null,
      },
      { onConflict: "habit_id,date" }
    )
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/today");
  revalidatePath("/progress");
  return { completion };
}

// ─── Get completions for date range ───────────────────────────────────────────

export async function getCompletions(startDate: string, endDate: string) {
  const user = await getUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("habit_completions")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");
  return data ?? [];
}

// ─── Create exception (pause) ─────────────────────────────────────────────────

export async function createHabitException(data: unknown) {
  const user = await getUser();
  const parsed = CreateExceptionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Verify ownership
  const [habit] = await db
    .select({ userId: habits.userId })
    .from(habits)
    .where(and(eq(habits.id, parsed.data.habitId), eq(habits.userId, user.id)))
    .limit(1);
  if (!habit) return { error: "Not found" };

  const [exception] = await db
    .insert(habitExceptions)
    .values(parsed.data)
    .returning();

  revalidatePath("/habits");
  revalidatePath("/today");
  return { exception };
}

// ─── Get habit with full detail ────────────────────────────────────────────────

export async function getHabitDetail(habitId: string) {
  const user = await getUser();
  const supabase = await createClient();

  const { data: habit } = await supabase
    .from("habits")
    .select("*, habit_schedules(*)")
    .eq("id", habitId)
    .eq("user_id", user.id)
    .single();

  if (!habit) return null;

  const { data: completions } = await supabase
    .from("habit_completions")
    .select("*")
    .eq("habit_id", habitId)
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  const { data: exceptions } = await supabase
    .from("habit_exceptions")
    .select("*")
    .eq("habit_id", habitId);

  return {
    habit,
    schedule: habit.habit_schedules?.[0] ?? null,
    completions: completions ?? [],
    exceptions: exceptions ?? [],
  };
}
