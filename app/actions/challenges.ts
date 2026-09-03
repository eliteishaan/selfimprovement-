"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { challenges, challengePhases, habits, habitSchedules } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  QuickCreateChallengeSchema,
  UpdateChallengeSchema,
  CreatePhaseSchema,
} from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Challenge } from "@/types";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// ─── Get active challenge ─────────────────────────────────────────────────────

export async function getCurrentChallenge(): Promise<Challenge | null> {
  const user = await getUser();
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(and(eq(challenges.userId, user.id), eq(challenges.status, "active")))
    .orderBy(desc(challenges.createdAt))
    .limit(1);
  return (challenge as Challenge) ?? null;
}

// ─── Quick Create ─────────────────────────────────────────────────────────────

export async function quickCreateChallenge(formData: FormData) {
  const user = await getUser();

  const raw = {
    name: formData.get("name") as string,
    objective: formData.get("objective") as string,
    startDate: formData.get("startDate") as string,
    endDate: formData.get("endDate") as string,
    commitments: JSON.parse(formData.get("commitments") as string) as string[],
  };

  const parsed = QuickCreateChallengeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, objective, startDate, endDate, commitments } = parsed.data;

  // Create challenge
  const [challenge] = await db
    .insert(challenges)
    .values({
      userId: user.id,
      name,
      objective,
      startDate,
      endDate,
      status: "active",
    })
    .returning();

  // Create habits from commitments (boolean, perform, daily)
  for (const title of commitments) {
    if (!title.trim()) continue;
    const [habit] = await db
      .insert(habits)
      .values({
        userId: user.id,
        challengeId: challenge.id,
        title: title.trim(),
        behavior: "boolean",
        direction: "build",
        isNonNegotiable: false,
      })
      .returning();

    await db.insert(habitSchedules).values({
      habitId: habit.id,
      frequencyType: "daily",
      effectiveFrom: startDate,
    });
  }

  revalidatePath("/today");
  revalidatePath("/challenges");
  redirect("/today");
}

// ─── Update challenge ─────────────────────────────────────────────────────────

export async function updateChallenge(id: string, data: unknown) {
  const user = await getUser();
  const parsed = UpdateChallengeSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Verify ownership
  const [existing] = await db
    .select({ userId: challenges.userId })
    .from(challenges)
    .where(and(eq(challenges.id, id), eq(challenges.userId, user.id)))
    .limit(1);

  if (!existing) return { error: "Not found" };

  await db.update(challenges).set(parsed.data).where(eq(challenges.id, id));
  revalidatePath("/challenges");
  revalidatePath(`/challenges/${id}`);
  revalidatePath("/today");
  return { success: true };
}

// ─── Get challenge with phases ────────────────────────────────────────────────

export async function getChallengeWithPhases(id: string) {
  const user = await getUser();
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(and(eq(challenges.id, id), eq(challenges.userId, user.id)))
    .limit(1);

  if (!challenge) return null;

  const phases = await db
    .select()
    .from(challengePhases)
    .where(eq(challengePhases.challengeId, id))
    .orderBy(challengePhases.orderIndex);

  return { challenge: challenge as Challenge, phases: (phases as any) as any[] };
}

// ─── List user challenges ─────────────────────────────────────────────────────

export async function listChallenges() {
  const user = await getUser();
  const data = await db
    .select()
    .from(challenges)
    .where(eq(challenges.userId, user.id))
    .orderBy(desc(challenges.createdAt));
  return data ?? [];
}

// ─── Create phase ─────────────────────────────────────────────────────────────

export async function createPhase(data: unknown) {
  const user = await getUser();
  const parsed = CreatePhaseSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Verify challenge ownership
  const [existing] = await db
    .select({ userId: challenges.userId })
    .from(challenges)
    .where(and(eq(challenges.id, parsed.data.challengeId), eq(challenges.userId, user.id)))
    .limit(1);
  if (!existing) return { error: "Not found" };

  const [phase] = await db.insert(challengePhases).values(parsed.data).returning();
  revalidatePath(`/challenges/${parsed.data.challengeId}`);
  return { phase };
}

