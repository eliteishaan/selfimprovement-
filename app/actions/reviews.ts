"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { dailyNotes, dailyScores, weeklyPlans, weeklyReviews } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  UpsertDailyNoteSchema,
  UpsertWeeklyPlanSchema,
  SaveWeeklyReviewSchema,
} from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// ─── Daily Notes ──────────────────────────────────────────────────────────────

export async function upsertDailyNote(data: unknown) {
  const user = await getUser();
  const parsed = UpsertDailyNoteSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: note, error } = await supabase
    .from("daily_notes")
    .upsert(
      { user_id: user.id, ...toSnakeCase(parsed.data) },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/reviews");
  return { note };
}

export async function getDailyNote(date: string) {
  const user = await getUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .single();
  return data ?? null;
}

// ─── Daily Score Snapshot (Rule 2: immutable once written) ────────────────────

export async function saveDailyScore(data: {
  challengeId: string;
  date: string;
  executionScore: number;
  habitsComponent: number;
  focusComponent: number;
  tasksComponent: number;
  readingComponent: number;
  scoreWeightsSnapshot: Record<string, number>;
}) {
  const user = await getUser();
  // Only insert — never update. If row exists, skip (historical score is immutable).
  const supabase = await createClient();
  await supabase
    .from("daily_scores")
    .upsert(
      {
        user_id: user.id,
        challenge_id: data.challengeId,
        date: data.date,
        execution_score: data.executionScore,
        habits_component: data.habitsComponent,
        focus_component: data.focusComponent,
        tasks_component: data.tasksComponent,
        reading_component: data.readingComponent,
        score_weights_snapshot: data.scoreWeightsSnapshot,
        calculated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,challenge_id,date",
        ignoreDuplicates: true, // Rule 2: never overwrite
      }
    );
}

export async function getDailyScores(startDate: string, endDate: string) {
  const user = await getUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_scores")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");
  return data ?? [];
}

// ─── Weekly Plan ──────────────────────────────────────────────────────────────

export async function upsertWeeklyPlan(data: unknown) {
  const user = await getUser();
  const parsed = UpsertWeeklyPlanSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("weekly_plans")
    .upsert(
      { user_id: user.id, ...toSnakeCase(parsed.data) },
      { onConflict: "user_id,week_start" }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/reviews");
  return { plan };
}

export async function getWeeklyPlan(weekStart: string) {
  const user = await getUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .single();
  return data ?? null;
}

// ─── Weekly Review ────────────────────────────────────────────────────────────

export async function saveWeeklyReview(data: unknown) {
  const user = await getUser();
  const parsed = SaveWeeklyReviewSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: review, error } = await supabase
    .from("weekly_reviews")
    .upsert(
      { user_id: user.id, ...toSnakeCase(parsed.data) },
      { onConflict: "user_id,week_start" }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/reviews");
  return { review };
}

export async function getWeeklyReview(weekStart: string) {
  const user = await getUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .single();
  return data ?? null;
}

export async function listWeeklyReviews(challengeId?: string) {
  const user = await getUser();
  const supabase = await createClient();
  const query = supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false });
  if (challengeId) query.eq("challenge_id", challengeId);
  const { data } = await query;
  return data ?? [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/([A-Z])/g, "_$1").toLowerCase(),
      value,
    ])
  );
}
