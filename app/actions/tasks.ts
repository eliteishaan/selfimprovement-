"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { CreateTaskSchema, UpdateTaskSchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function createTask(data: unknown) {
  const user = await getUser();
  const parsed = CreateTaskSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const [task] = await db
    .insert(tasks)
    .values({ ...parsed.data, userId: user.id })
    .returning();

  revalidatePath("/tasks");
  revalidatePath("/today");
  return { task };
}

export async function updateTask(id: string, data: unknown) {
  const user = await getUser();
  const parsed = UpdateTaskSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // If setting as top priority, clear existing top priority first
  if (parsed.data.isTopPriority === true) {
    await db
      .update(tasks)
      .set({ isTopPriority: false })
      .where(eq(tasks.userId, user.id));
  }

  // If marking complete, set completedAt
  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "completed" && !updates.completedAt) {
    updates.completedAt = new Date().toISOString();
  }

  const [task] = await db
    .update(tasks)
    .set(updates)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  revalidatePath("/tasks");
  revalidatePath("/today");
  return { task };
}

export async function getTodayTasks(date: string) {
  const user = await getUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["today", "in_progress"])
    .order("is_top_priority", { ascending: false })
    .order("priority", { ascending: true });
  return data ?? [];
}

export async function getTasksByStatus(statuses: string[]) {
  const user = await getUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .in("status", statuses)
    .order("is_top_priority", { ascending: false })
    .order("priority", { ascending: true })
    .order("due_date", { ascending: true });
  return data ?? [];
}

export async function deleteTask(id: string) {
  const user = await getUser();
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
  revalidatePath("/tasks");
  revalidatePath("/today");
  return { success: true };
}
