"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { focusSessions } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  StartFocusSessionSchema,
  EndFocusSessionSchema,
} from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// ─── Get active session ───────────────────────────────────────────────────────

export async function getActiveSession() {
  const user = await getUser();
  const [session] = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, user.id),
        isNull(focusSessions.endedAt)
      )
    )
    .limit(1);
  return session ?? null;
}

// ─── Start session ────────────────────────────────────────────────────────────
// RULE 4: only one active session per user at a time.

export async function startFocusSession(data: unknown) {
  const user = await getUser();
  const parsed = StartFocusSessionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Check for existing active session
  const existing = await getActiveSession();
  if (existing) {
    return {
      error: "You have an active focus session. End it before starting a new one.",
      activeSession: existing,
    };
  }

  const [session] = await db
    .insert(focusSessions)
    .values({
      userId: user.id,
      challengeId: parsed.data.challengeId ?? null,
      goalId: parsed.data.goalId ?? null,
      taskId: parsed.data.taskId ?? null,
      subject: parsed.data.subject ?? null,
      sessionType: parsed.data.sessionType,
      startedAt: new Date().toISOString(),
    })
    .returning();

  revalidatePath("/today");
  revalidatePath("/focus");
  return { session };
}

// ─── End session ──────────────────────────────────────────────────────────────

export async function endFocusSession(data: unknown) {
  const user = await getUser();
  const parsed = EndFocusSessionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Verify ownership + that session is still active
  const [session] = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.id, parsed.data.sessionId),
        eq(focusSessions.userId, user.id),
        isNull(focusSessions.endedAt)
      )
    )
    .limit(1);

  if (!session) return { error: "Session not found or already ended" };

  const endedAt = new Date();
  const durationSeconds = Math.floor(
    (endedAt.getTime() - new Date(session.startedAt).getTime()) / 1000
  );

  const [updated] = await db
    .update(focusSessions)
    .set({
      endedAt: endedAt.toISOString(),
      durationSeconds,
      note: parsed.data.note ?? null,
    })
    .where(eq(focusSessions.id, session.id))
    .returning();

  revalidatePath("/today");
  revalidatePath("/focus");
  return { session: updated };
}

// ─── Get focus sessions for date range ────────────────────────────────────────

export async function getFocusSessions(startDate: string, endDate: string) {
  const user = await getUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", user.id)
    .gte("started_at", `${startDate}T00:00:00`)
    .lte("started_at", `${endDate}T23:59:59`)
    .order("started_at", { ascending: false });
  return data ?? [];
}

// ─── Today's focus total ─────────────────────────────────────────────────────

export async function getTodayFocusSeconds(date: string): Promise<number> {
  const sessions = await getFocusSessions(date, date);
  return sessions
    .filter((s: any) => s.ended_at !== null)
    .reduce((sum: number, s: any) => sum + (s.duration_seconds ?? 0), 0);
}
